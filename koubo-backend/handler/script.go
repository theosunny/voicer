package handler

import (
	"context"
	"koubo-backend/model"
	"koubo-backend/repo"
	"koubo-backend/service"
	"strings"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

type ScriptHandler struct {
	svc        *service.ScriptService
	scriptRepo *repo.ScriptRepo
}

func NewScriptHandler(svc *service.ScriptService, scriptRepo *repo.ScriptRepo) *ScriptHandler {
	return &ScriptHandler{svc: svc, scriptRepo: scriptRepo}
}

// GetByID handles GET /api/script/:id
func (h *ScriptHandler) GetByID(ctx context.Context, c *app.RequestContext) {
	id := c.Param("id")
	if h.scriptRepo == nil {
		c.JSON(consts.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	script, err := h.scriptRepo.GetByID(ctx, id)
	if err != nil {
		c.JSON(consts.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	c.JSON(consts.StatusOK, map[string]any{
		"success": true,
		"data":    script,
	})
}

// Generate handles POST /api/script/generate
// Supports SSE streaming (default) and plain JSON response (when ?stream=0 is set).
func (h *ScriptHandler) Generate(ctx context.Context, c *app.RequestContext) {
	var req model.ScriptGenerateRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(consts.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}

	if req.DurationSec <= 0 {
		req.DurationSec = parseDuration(req.Duration)
	}
	if req.DurationSec <= 0 {
		req.DurationSec = 60
	}

	req.ScriptType = normalizeScriptType(req.ScriptType)
	req.Style = normalizeStyle(req.Style)

	prompt := h.svc.BuildPrompt(req)

	chunkCh := make(chan string, 64)
	var fullContent strings.Builder
	errCh := make(chan error, 1)

	go func() {
		errCh <- h.svc.GenerateStream(ctx, prompt, chunkCh)
		close(chunkCh)
	}()

	stream := string(c.FormValue("stream")) != "0"

	if stream {
		c.Response.Header.Set("Content-Type", "text/event-stream")
		c.Response.Header.Set("Cache-Control", "no-cache")
		c.Response.Header.Set("Connection", "keep-alive")
		c.SetStatusCode(consts.StatusOK)

		for chunk := range chunkCh {
			fullContent.WriteString(chunk)
			c.Response.AppendBody([]byte(service.BuildSSEChunk(chunk)))
		}

		if err := <-errCh; err != nil {
			c.Response.AppendBody([]byte(service.BuildSSEError(err.Error())))
			return
		}

		content := fullContent.String()
		dur := service.EstimateDuration(content)

		userID := req.UserID
		if userID == "" {
			userID = "00000000-0000-0000-0000-000000000000"
		}
		script := &model.Script{
			UserID:           userID,
			Title:            req.Keywords + req.Topic,
			Content:          content,
			ScriptType:       req.ScriptType,
			Style:            req.Style,
			DurationEstimate: dur,
		}

		scriptID := ""
		if h.scriptRepo != nil {
			if err := h.scriptRepo.Create(ctx, script); err == nil {
				scriptID = script.ID
			}
		}

		c.Response.AppendBody([]byte(service.BuildSSEDone(scriptID)))
		return
	}

	// Non-streaming mode: collect fully then return JSON (dev tools)
	for chunk := range chunkCh {
		fullContent.WriteString(chunk)
	}

	if err := <-errCh; err != nil {
		c.JSON(consts.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
		return
	}

	content := fullContent.String()
	dur := service.EstimateDuration(content)

	userID := req.UserID
	if userID == "" {
		userID = "00000000-0000-0000-0000-000000000000"
	}
	script := &model.Script{
		UserID:           userID,
		Title:            req.Keywords + req.Topic,
		Content:          content,
		ScriptType:       req.ScriptType,
		Style:            req.Style,
		DurationEstimate: dur,
	}

	scriptID := ""
	if h.scriptRepo != nil {
		if err := h.scriptRepo.Create(ctx, script); err == nil {
			scriptID = script.ID
		}
	}

	c.JSON(consts.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"id":      scriptID,
			"content": content,
		},
	})
}

// SaveDraft handles POST /api/script/draft
func (h *ScriptHandler) SaveDraft(ctx context.Context, c *app.RequestContext) {
	var req struct {
		ID         string `json:"id"`
		Title      string `json:"title"`
		Content    string `json:"content"`
		ScriptType string `json:"script_type"`
		Style      string `json:"style"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(consts.StatusBadRequest, map[string]any{"success": false, "error": "invalid request"})
		return
	}

	scriptType := normalizeScriptType(req.ScriptType)
	style := normalizeStyle(req.Style)

	if h.scriptRepo == nil {
		c.JSON(consts.StatusOK, map[string]any{"success": true, "data": map[string]string{"id": "mock-script-id"}})
		return
	}

	if req.ID != "" {
		s := &model.Script{
			ID:               req.ID,
			Title:            req.Title,
			Content:          req.Content,
			ScriptType:       scriptType,
			Style:            style,
			DurationEstimate: service.EstimateDuration(req.Content),
			Status:           "draft",
			UpdatedAt:        time.Now(),
		}
		if err := h.scriptRepo.Update(ctx, s); err != nil {
			c.JSON(consts.StatusInternalServerError, map[string]any{"success": false, "error": "update failed"})
			return
		}
		c.JSON(consts.StatusOK, map[string]any{"success": true, "data": map[string]string{"id": req.ID}})
		return
	}

	s := &model.Script{
		UserID:           "00000000-0000-0000-0000-000000000000",
		Title:            req.Title,
		Content:          req.Content,
		ScriptType:       scriptType,
		Style:            style,
		DurationEstimate: service.EstimateDuration(req.Content),
		Status:           "draft",
	}
	if err := h.scriptRepo.Create(ctx, s); err != nil {
		c.JSON(consts.StatusInternalServerError, map[string]any{"success": false, "error": "create failed"})
		return
	}
	c.JSON(consts.StatusOK, map[string]any{"success": true, "data": map[string]string{"id": s.ID}})
}

func parseDuration(raw string) int {
	switch raw {
	case "30s":
		return 30
	case "60s":
		return 60
	case "3min":
		return 180
	default:
		return 60
	}
}

func normalizeScriptType(t string) string {
	switch t {
	case "产品推广":
		return "promo"
	case "个人感悟":
		return "insight"
	case "生活分享":
		return "life"
	case "知识科普":
		return "insight"
	case "情感故事":
		return "insight"
	default:
		if t == "promo" || t == "insight" || t == "life" {
			return t
		}
		return "insight"
	}
}

func normalizeStyle(s string) string {
	switch s {
	case "轻松随性":
		return "casual"
	case "专业权威":
		return "professional"
	case "情感共鸣":
		return "emotional"
	case "幽默风趣":
		return "casual"
	default:
		if s == "casual" || s == "professional" || s == "emotional" {
			return s
		}
		return "casual"
	}
}
