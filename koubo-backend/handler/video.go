package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"koubo-backend/model"
	"koubo-backend/repo"
	"koubo-backend/service"
	"koubo-backend/storage"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

type VideoHandler struct {
	videoRepo *repo.VideoRepo
	videoSvc  *service.VideoService
	ossClient *storage.OSSClient
}

func NewVideoHandler(videoRepo *repo.VideoRepo, videoSvc *service.VideoService, ossClient *storage.OSSClient) *VideoHandler {
	return &VideoHandler{videoRepo: videoRepo, videoSvc: videoSvc, ossClient: ossClient}
}

// Submit handles POST /api/video/submit (multipart form)
// Form fields:
//   - video: binary file
//   - script_id: string
//   - frame_markers: JSON array
//   - asr_result: string
//   - user_id: string
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
		c.JSON(consts.StatusBadRequest, map[string]string{"error": "video file required"})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(consts.StatusInternalServerError, map[string]string{"error": "cannot open file"})
		return
	}
	defer file.Close()

	videoData, err := io.ReadAll(file)
	if err != nil {
		c.JSON(consts.StatusInternalServerError, map[string]string{"error": "cannot read file"})
		return
	}

	var scriptIDPtr *string
	if scriptID != "" {
		scriptIDPtr = &scriptID
	}

	v := &model.Video{
		UserID:       userID,
		ScriptID:     scriptIDPtr,
		FrameMarkers: markers,
		ASRResult:    asrResult,
		Status:       "processing",
	}

	// Upload raw video to OSS if client available
	if h.ossClient != nil {
		key := fmt.Sprintf("videos/raw/%s.mp4", userID)
		url, err := h.ossClient.Upload(ctx, key, bytes.NewReader(videoData))
		if err != nil {
			c.JSON(consts.StatusInternalServerError, map[string]string{"error": "upload failed"})
			return
		}
		v.RawVideoURL = url
	}

	// Save to DB
	if h.videoRepo != nil {
		if err := h.videoRepo.Create(ctx, v); err != nil {
			c.JSON(consts.StatusInternalServerError, map[string]string{"error": "db error"})
			return
		}
	} else {
		v.ID = "mock-video-id"
	}

	// Enqueue processing task
	if h.videoSvc != nil {
		_ = h.videoSvc.EnqueueProcess(ctx, v.ID)
	}

	c.JSON(consts.StatusOK, map[string]string{"video_id": v.ID})
}

// Status handles GET /api/video/:id/status
func (h *VideoHandler) Status(ctx context.Context, c *app.RequestContext) {
	id := c.Param("id")
	if h.videoRepo == nil {
		c.JSON(consts.StatusOK, model.VideoStatusResponse{Status: "processing"})
		return
	}
	v, err := h.videoRepo.GetByID(ctx, id)
	if err != nil {
		c.JSON(consts.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	c.JSON(consts.StatusOK, model.VideoStatusResponse{
		Status:            v.Status,
		ProcessedVideoURL: v.ProcessedVideoURL,
		ErrorMsg:          v.ErrorMsg,
	})
}
