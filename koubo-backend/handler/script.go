package handler

import (
	"context"
	"koubo-backend/model"
	"koubo-backend/repo"
	"koubo-backend/service"
	"strings"

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

// Generate handles POST /api/script/generate
// Returns SSE stream of chunks then a done event with script_id
func (h *ScriptHandler) Generate(ctx context.Context, c *app.RequestContext) {
	var req model.ScriptGenerateRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(consts.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	if req.DurationSec <= 0 {
		req.DurationSec = 60
	}

	prompt := h.svc.BuildPrompt(req)

	c.Response.Header.Set("Content-Type", "text/event-stream")
	c.Response.Header.Set("Cache-Control", "no-cache")
	c.Response.Header.Set("Connection", "keep-alive")
	c.SetStatusCode(consts.StatusOK)

	chunkCh := make(chan string, 64)
	var fullContent strings.Builder
	errCh := make(chan error, 1)

	go func() {
		errCh <- h.svc.GenerateStream(ctx, prompt, chunkCh)
		close(chunkCh)
	}()

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
}
