package model

import "time"

type Template struct {
	ID               string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Title            string    `gorm:"size:128;not null" json:"title"`
	Domain           string    `gorm:"size:64;not null;default:''" json:"domain"`
	ContentStructure string    `gorm:"type:text;not null" json:"content_structure"`
	UsageCount       int       `gorm:"not null;default:0" json:"usage_count"`
	IsFeatured       bool      `gorm:"not null;default:false" json:"is_featured"`
	CreatedAt        time.Time `json:"created_at"`
}

func (Template) TableName() string { return "templates" }
