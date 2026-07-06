package model

import "time"

type Script struct {
	ID               string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID           string    `gorm:"type:uuid;not null" json:"user_id"`
	Title            string    `gorm:"size:128;not null;default:''" json:"title"`
	Content          string    `gorm:"type:text;not null;default:''" json:"content"`
	ScriptType       string    `gorm:"column:script_type;size:16;not null" json:"script_type"`
	Style            string    `gorm:"size:32;not null;default:'normal'" json:"style"`
	DurationEstimate int       `gorm:"not null;default:0" json:"duration_estimate"`
	Status           string    `gorm:"size:16;not null;default:'draft'" json:"status"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func (Script) TableName() string { return "scripts" }

type ScriptGenerateRequest struct {
	Mode        string `json:"mode"`        // "domain" | "free"
	Domain      string `json:"domain"`      // used when mode=domain
	Keywords    string `json:"keywords"`
	Topic       string `json:"topic"`       // used when mode=free
	Style       string `json:"style"`       // "casual" | "professional" | "emotional" or Chinese label
	ScriptType  string `json:"script_type"` // "promo" | "insight" | "life" or Chinese label
	Duration    string `json:"duration"`    // "30s" | "60s" | "3min" — from frontend
	DurationSec int    `json:"duration_sec"`
	UserID      string `json:"user_id"`
	TemplateID  string `json:"template_id"`
}
