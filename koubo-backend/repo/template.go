package repo

import (
	"context"
	"koubo-backend/model"

	"gorm.io/gorm"
)

type TemplateRepo struct {
	db *gorm.DB
}

func NewTemplateRepo(db *gorm.DB) *TemplateRepo {
	return &TemplateRepo{db: db}
}

// ListTrending returns templates ordered by is_featured desc, usage_count desc.
// domain="" means all domains.
func (r *TemplateRepo) ListTrending(ctx context.Context, domain string, limit int) ([]model.Template, error) {
	if limit <= 0 {
		limit = 10
	}
	var templates []model.Template
	q := r.db.WithContext(ctx).Order("is_featured DESC, usage_count DESC").Limit(limit)
	if domain != "" {
		q = q.Where("domain = ?", domain)
	}
	err := q.Find(&templates).Error
	return templates, err
}

// IncrementUsage increments the usage_count for a template.
func (r *TemplateRepo) IncrementUsage(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Model(&model.Template{}).
		Where("id = ?", id).
		UpdateColumn("usage_count", gorm.Expr("usage_count + 1")).Error
}

func (r *TemplateRepo) GetByID(ctx context.Context, id string) (*model.Template, error) {
	var t model.Template
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&t).Error
	return &t, err
}
