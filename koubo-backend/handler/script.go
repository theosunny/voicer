package handler

import (
	"context"
	"fmt"
	"koubo-backend/model"
	"koubo-backend/repo"
	"koubo-backend/service"
	"strings"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

type ScriptHandler struct {
	svc          *service.ScriptService
	agentSvc     *service.AgentService // optional; nil = use direct LLM
	scriptRepo   *repo.ScriptRepo
	templateRepo *repo.TemplateRepo
}

func NewScriptHandler(svc *service.ScriptService, agentSvc *service.AgentService, scriptRepo *repo.ScriptRepo, templateRepo *repo.TemplateRepo) *ScriptHandler {
	return &ScriptHandler{svc: svc, agentSvc: agentSvc, scriptRepo: scriptRepo, templateRepo: templateRepo}
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

	// If a template is specified, fetch its content_structure and inject into the request
	if req.TemplateID != "" && h.templateRepo != nil {
		if tpl, err := h.templateRepo.GetByID(ctx, req.TemplateID); err == nil {
			req.TemplateStructure = tpl.ContentStructure
			go h.templateRepo.IncrementUsage(ctx, req.TemplateID) //nolint:errcheck
		}
	}

	chunkCh := make(chan string, 64)
	var fullContent strings.Builder
	errCh := make(chan error, 1)

	if h.agentSvc != nil {
		userID := req.UserID
		if userID == "" {
			userID = "default"
		}
		personaType := req.PersonaType
		if personaType == "" {
			personaType = "general"
		}
		personaSlug := userID + "-" + personaType
		baseSlug := userID + "-base"
		prompt := h.svc.BuildPrompt(req)
		go func() {
			_ = h.agentSvc.EnsurePersona(ctx, "koubo-creator", baseSlug, "用户通用档案", "记录该用户跨人设的话题偏好和使用习惯。")
			_ = h.agentSvc.EnsurePersona(ctx, "koubo-creator", personaSlug, "口播用户-"+personaType, "根据历史偏好个性化生成口播文案。")
			errCh <- h.agentSvc.GenerateStream(ctx, "koubo-creator", personaSlug, prompt, chunkCh)
			close(chunkCh)
		}()
	} else {
		prompt := h.svc.BuildPrompt(req)
		go func() {
			errCh <- h.svc.GenerateStream(ctx, prompt, chunkCh)
			close(chunkCh)
		}()
	}

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

// ListScripts handles GET /api/scripts?limit=20&offset=0
func (h *ScriptHandler) ListScripts(ctx context.Context, c *app.RequestContext) {
	limit := 20
	offset := 0
	if v := string(c.Query("limit")); v != "" {
		if n, err := parseInt(v); err == nil && n > 0 {
			limit = n
		}
	}
	if v := string(c.Query("offset")); v != "" {
		if n, err := parseInt(v); err == nil && n >= 0 {
			offset = n
		}
	}

	// Use anonymous user ID as fallback — scripts saved without login are still listable
	userID := "00000000-0000-0000-0000-000000000000"

	scripts, err := h.scriptRepo.List(ctx, userID, limit, offset)
	if err != nil {
		c.JSON(consts.StatusInternalServerError, map[string]any{"success": false, "error": "db error"})
		return
	}
	c.JSON(consts.StatusOK, map[string]any{"success": true, "data": scripts})
}

func parseInt(s string) (int, error) {
	n := 0
	for _, ch := range s {
		if ch < '0' || ch > '9' {
			return 0, fmt.Errorf("not a number")
		}
		n = n*10 + int(ch-'0')
	}
	return n, nil
}

// sanitizeSlug converts an arbitrary string to a valid [a-z0-9-] slug (max 32 chars).
func sanitizeSlug(s string) string {
	var out []byte
	for i, r := range s {
		if i >= 32 {
			break
		}
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			out = append(out, byte(r))
		} else if r >= 'A' && r <= 'Z' {
			out = append(out, byte(r+32))
		}
	}
	if len(out) == 0 {
		return "general"
	}
	return string(out)
}

func parseDuration(raw string) int {
	switch raw {
	case "30s":
		return 30
	case "60s":
		return 60
	case "3min":
		return 180
	case "5min":
		return 300
	case "10min":
		return 600
	case "15min":
		return 900
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
