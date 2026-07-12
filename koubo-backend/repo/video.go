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

func (r *VideoRepo) ListByUser(ctx context.Context, userID string, limit, offset int) ([]model.Video, int64, error) {
	var total int64
	var videos []model.Video
	q := r.db.WithContext(ctx).Model(&model.Video{}).Where("user_id = ?", userID)
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := q.Order("created_at DESC").Limit(limit).Offset(offset).Find(&videos).Error; err != nil {
		return nil, 0, err
	}
	return videos, total, nil
}

func (r *VideoRepo) Delete(ctx context.Context, id string) (rawVideoURL string, err error) {
	var v model.Video
	if err = r.db.WithContext(ctx).Where("id = ?", id).First(&v).Error; err != nil {
		return "", err
	}
	rawVideoURL = v.RawVideoURL
	return rawVideoURL, r.db.WithContext(ctx).Delete(&model.Video{}, "id = ?", id).Error
}

func (r *VideoRepo) UpdateRawURL(ctx context.Context, id, rawURL string) error {
	return r.db.WithContext(ctx).Model(&model.Video{}).Where("id = ?", id).
		Update("raw_video_url", rawURL).Error
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
