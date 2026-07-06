package repo

import (
	"context"
	"koubo-backend/model"
	"time"

	"gorm.io/gorm"
)

type ScriptRepo struct {
	db *gorm.DB
}

func NewScriptRepo(db *gorm.DB) *ScriptRepo {
	return &ScriptRepo{db: db}
}

func (r *ScriptRepo) Create(ctx context.Context, s *model.Script) error {
	return r.db.WithContext(ctx).Create(s).Error
}

func (r *ScriptRepo) GetByID(ctx context.Context, id string) (*model.Script, error) {
	var s model.Script
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&s).Error
	return &s, err
}

func (r *ScriptRepo) Update(ctx context.Context, s *model.Script) error {
	return r.db.WithContext(ctx).Model(s).Updates(map[string]any{
		"title":             s.Title,
		"content":           s.Content,
		"script_type":       s.ScriptType,
		"style":             s.Style,
		"duration_estimate": s.DurationEstimate,
		"status":            s.Status,
		"updated_at":        time.Now(),
	}).Error
}
