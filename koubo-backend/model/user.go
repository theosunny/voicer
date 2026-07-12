package model

import "time"

type User struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	OpenID     string    `gorm:"column:openid;size:128;not null;uniqueIndex:idx_openid_platform" json:"openid"`
	Platform   string    `gorm:"size:16;not null;uniqueIndex:idx_openid_platform" json:"platform"`
	Nickname   string    `gorm:"size:64" json:"nickname"`
	AvatarURL  string    `gorm:"type:text" json:"avatar_url"`
	Persona    string    `gorm:"type:text" json:"persona"`
	Token      string    `gorm:"size:64;index" json:"token"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (User) TableName() string { return "users" }
