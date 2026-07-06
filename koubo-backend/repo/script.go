package repo

import (
	"context"
	"koubo-backend/model"

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
