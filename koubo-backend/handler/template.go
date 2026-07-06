package handler

import (
	"context"
	"koubo-backend/model"
	"koubo-backend/repo"
	"strconv"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

type TemplateHandler struct {
	templateRepo *repo.TemplateRepo
}

func NewTemplateHandler(templateRepo *repo.TemplateRepo) *TemplateHandler {
	return &TemplateHandler{templateRepo: templateRepo}
}

// List handles GET /api/templates/trending
// Query params: domain (optional), limit (default 10)
func (h *TemplateHandler) List(ctx context.Context, c *app.RequestContext) {
	domain := string(c.Query("domain"))
	limitStr := string(c.Query("limit"))
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 10
	}

	if h.templateRepo == nil {
		c.JSON(consts.StatusOK, map[string]any{"templates": []model.Template{}})
		return
	}

	templates, err := h.templateRepo.ListTrending(ctx, domain, limit)
	if err != nil {
		c.JSON(consts.StatusInternalServerError, map[string]string{"error": "query failed"})
		return
	}
	if templates == nil {
		templates = []model.Template{}
	}
	c.JSON(consts.StatusOK, map[string]any{"templates": templates})
}
