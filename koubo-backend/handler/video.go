package handler

import (
	"context"
	"encoding/json"
	"io"
	"koubo-backend/model"
	"koubo-backend/repo"
	"koubo-backend/service"
	"os"
	"path/filepath"
	"strconv"

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
	switch ct := fileHeader.Header.Get("Content-Type"); ct {
	case "video/mp4":
		ext = ".mp4"
	case "audio/mp4":
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

	// Save raw file; store just the filename (no path prefix)
	fileName := v.ID + ext
	localPath := filepath.Join(h.uploadDir, fileName)
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

	// Store just the filename — worker & status page build the full path
	v.RawVideoURL = fileName
	if h.videoRepo != nil {
		h.videoRepo.UpdateRawURL(ctx, v.ID, fileName)
	}

	// Enqueue processing task (will just mark as completed for audio-only MVP)
	if h.videoSvc != nil {
		_ = h.videoSvc.EnqueueProcess(ctx, v.ID)
	} else {
		// No queue — mark completed immediately
		if h.videoRepo != nil {
			_ = h.videoRepo.UpdateStatus(ctx, v.ID, "completed", fileName, "")
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

// Delete handles DELETE /api/video/:id
func (h *VideoHandler) Delete(ctx context.Context, c *app.RequestContext) {
	id := c.Param("id")
	if h.videoRepo == nil {
		c.JSON(consts.StatusOK, map[string]any{"success": true})
		return
	}
	rawURL, err := h.videoRepo.Delete(ctx, id)
	if err != nil {
		c.JSON(consts.StatusNotFound, map[string]any{"success": false, "error": "not found"})
		return
	}
	// Best-effort: delete local file
	if rawURL != "" {
		_ = os.Remove(filepath.Join(h.uploadDir, rawURL))
	}
	c.JSON(consts.StatusOK, map[string]any{"success": true})
}

// List handles GET /api/videos
func (h *VideoHandler) List(ctx context.Context, c *app.RequestContext) {
	userID := string(c.FormValue("user_id"))
	if userID == "" {
		userID = "00000000-0000-0000-0000-000000000000"
	}
	limit := 20
	if v := c.FormValue("limit"); string(v) != "" {
		if n, err := strconv.Atoi(string(v)); err == nil && n > 0 && n <= 50 {
			limit = n
		}
	}
	offset := 0
	if v := c.FormValue("offset"); string(v) != "" {
		if n, err := strconv.Atoi(string(v)); err == nil && n >= 0 {
			offset = n
		}
	}
	if h.videoRepo == nil {
		c.JSON(consts.StatusOK, map[string]any{"success": true, "data": []model.Video{}, "total": 0})
		return
	}
	videos, total, err := h.videoRepo.ListByUser(ctx, userID, limit, offset)
	if err != nil {
		c.JSON(consts.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
		return
	}
	c.JSON(consts.StatusOK, map[string]any{"success": true, "data": videos, "total": total})
}
