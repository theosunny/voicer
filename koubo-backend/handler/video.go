package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"koubo-backend/model"
	"koubo-backend/repo"
	"koubo-backend/service"
	"os"
	"path/filepath"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

type VideoHandler struct {
	videoRepo *repo.VideoRepo
	videoSvc  *service.VideoService
	uploadDir string // local fallback when OSS is not configured
}

func NewVideoHandler(videoRepo *repo.VideoRepo, videoSvc *service.VideoService, uploadDir string) *VideoHandler {
	if uploadDir == "" {
		uploadDir = "uploads"
	}
	os.MkdirAll(uploadDir, 0755)
	return &VideoHandler{videoRepo: videoRepo, videoSvc: videoSvc, uploadDir: uploadDir}
}

// Submit handles POST /api/video/submit (multipart form)
// Form fields:
//   - video: binary file (audio mp3 from RecorderManager)
//   - script_id: string
//   - frame_markers: JSON array
//   - asr_result: string
func (h *VideoHandler) Submit(ctx context.Context, c *app.RequestContext) {
	userID := string(c.FormValue("user_id"))
	if userID == "" {
		userID = "00000000-0000-0000-0000-000000000000"
	}
	scriptID := string(c.FormValue("script_id"))
	asrResult := string(c.FormValue("asr_result"))
	markersJSON := c.FormValue("frame_markers")

	var markers model.FrameMarkers
	_ = json.Unmarshal(markersJSON, &markers)

	fileHeader, err := c.FormFile("video")
	if err != nil {
		c.JSON(consts.StatusBadRequest, map[string]any{"success": false, "error": "video file required"})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(consts.StatusInternalServerError, map[string]any{"success": false, "error": "cannot open file"})
		return
	}
	defer file.Close()

	// Detect file extension from content type or use .mp3 default
	ext := ".mp3"
	if ct := fileHeader.Header.Get("Content-Type"); ct == "audio/mp4" || ct == "video/mp4" {
		ext = ".m4a"
	}

	var scriptIDPtr *string
	if scriptID != "" {
		scriptIDPtr = &scriptID
	}

	// First create DB record to get an ID
	v := &model.Video{
		UserID:       userID,
		ScriptID:     scriptIDPtr,
		FrameMarkers: markers,
		ASRResult:    asrResult,
		Status:       "processing",
	}

	if h.videoRepo != nil {
		if err := h.videoRepo.Create(ctx, v); err != nil {
			c.JSON(consts.StatusInternalServerError, map[string]any{"success": false, "error": "db error: " + err.Error()})
			return
		}
	} else {
		v.ID = "mock-video-id"
	}

	// Save uploaded file to local disk
	localPath := filepath.Join(h.uploadDir, v.ID+ext)
	dst, err := os.Create(localPath)
	if err != nil {
		c.JSON(consts.StatusInternalServerError, map[string]any{"success": false, "error": "cannot save file"})
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		c.JSON(consts.StatusInternalServerError, map[string]any{"success": false, "error": "write failed"})
		return
	}

	// Store local path as raw URL (can be served via static file handler)
	rawURL := fmt.Sprintf("/uploads/%s%s", v.ID, ext)
	if h.videoRepo != nil {
		// Update the record with the raw URL — use direct DB update
		h.videoRepo.UpdateStatus(ctx, v.ID, "processing", rawURL, "")
		v.RawVideoURL = rawURL
	}

	// Enqueue processing task (will just mark as completed for audio-only MVP)
	if h.videoSvc != nil {
		_ = h.videoSvc.EnqueueProcess(ctx, v.ID)
	} else {
		// No queue — mark completed immediately
		if h.videoRepo != nil {
			_ = h.videoRepo.UpdateStatus(ctx, v.ID, "completed", rawURL, "")
		}
	}

	c.JSON(consts.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]string{"video_id": v.ID},
	})
}

// Status handles GET /api/video/:id/status
func (h *VideoHandler) Status(ctx context.Context, c *app.RequestContext) {
	id := c.Param("id")
	if h.videoRepo == nil {
		c.JSON(consts.StatusOK, map[string]any{
			"success": true,
			"data":    model.VideoStatusResponse{Status: "completed"},
		})
		return
	}
	v, err := h.videoRepo.GetByID(ctx, id)
	if err != nil {
		c.JSON(consts.StatusNotFound, map[string]any{"success": false, "error": "not found"})
		return
	}
	c.JSON(consts.StatusOK, map[string]any{
		"success": true,
		"data": model.VideoStatusResponse{
			Status:            v.Status,
			ProcessedVideoURL: v.ProcessedVideoURL,
			ErrorMsg:          v.ErrorMsg,
		},
	})
}
