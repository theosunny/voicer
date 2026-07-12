package repo

import (
	"context"
	"koubo-backend/model"

	"gorm.io/gorm"
)

type UserRepo struct {
	db *gorm.DB
}

func NewUserRepo(db *gorm.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) FindOrCreate(ctx context.Context, openID, platform string) (*model.User, error) {
	var u model.User
	err := r.db.WithContext(ctx).
		Where("openid = ? AND platform = ?", openID, platform).
		FirstOrCreate(&u, model.User{OpenID: openID, Platform: platform}).Error
	return &u, err
}

func (r *UserRepo) UpdateToken(ctx context.Context, userID, token string) error {
	return r.db.WithContext(ctx).Model(&model.User{}).
		Where("id = ?", userID).
		Update("token", token).Error
}

func (r *UserRepo) FindByToken(ctx context.Context, token string) (*model.User, error) {
	var u model.User
	err := r.db.WithContext(ctx).Where("token = ?", token).First(&u).Error
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) UpdateProfile(ctx context.Context, userID, nickname, avatarURL, persona string) error {
	return r.db.WithContext(ctx).Model(&model.User{}).
		Where("id = ?", userID).
		Updates(map[string]interface{}{"nickname": nickname, "avatar_url": avatarURL, "persona": persona}).Error
}

func (r *UserRepo) FindByID(ctx context.Context, userID string) (*model.User, error) {
	var u model.User
	err := r.db.WithContext(ctx).Where("id = ?", userID).First(&u).Error
	if err != nil {
		return nil, err
	}
	return &u, nil
}
