package model

import "time"

type Template struct {
	ID               string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Title            string    `gorm:"size:128;not null" json:"title"`
	Description      string    `gorm:"type:text;not null;default:''" json:"description"`
	Domain           string    `gorm:"size:64;not null;default:''" json:"domain"`
	ContentStructure string    `gorm:"type:text;not null" json:"content_structure"`
	Duration         string    `gorm:"size:8;not null;default:'60s'" json:"duration"`
	ScriptType       string    `gorm:"size:16;not null;default:'promo'" json:"script_type"`
	UsageCount       int       `gorm:"not null;default:0" json:"usage_count"`
	IsFeatured       bool      `gorm:"not null;default:false" json:"is_featured"`
	CreatedAt        time.Time `json:"created_at"`
}

func (Template) TableName() string { return "templates" }
