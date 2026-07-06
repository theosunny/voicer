package repo

import (
	"context"
	"koubo-backend/model"
	"time"

	"gorm.io/gorm"
)

type VideoRepo struct {
	db *gorm.DB
}

func NewVideoRepo(db *gorm.DB) *VideoRepo {
	return &VideoRepo{db: db}
}

func (r *VideoRepo) Create(ctx context.Context, v *model.Video) error {
	return r.db.WithContext(ctx).Create(v).Error
}

func (r *VideoRepo) GetByID(ctx context.Context, id string) (*model.Video, error) {
	var v model.Video
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&v).Error
	return &v, err
}

func (r *VideoRepo) UpdateStatus(ctx context.Context, id, status, processedURL, errMsg string) error {
	updates := map[string]any{
		"status":    status,
		"error_msg": errMsg,
	}
	if processedURL != "" {
		updates["processed_video_url"] = processedURL
	}
	if status == "completed" || status == "failed" {
		now := time.Now()
		updates["completed_at"] = now
	}
	return r.db.WithContext(ctx).Model(&model.Video{}).Where("id = ?", id).Updates(updates).Error
}
