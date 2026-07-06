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
