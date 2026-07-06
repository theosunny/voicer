package model

import "time"

type User struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	OpenID    string    `gorm:"size:128;not null" json:"openid"`
	Platform  string    `gorm:"size:16;not null" json:"platform"`
	Nickname  string    `gorm:"size:64" json:"nickname"`
	AvatarURL string    `gorm:"type:text" json:"avatar_url"`
	CreatedAt time.Time `json:"created_at"`
}

func (User) TableName() string { return "users" }
