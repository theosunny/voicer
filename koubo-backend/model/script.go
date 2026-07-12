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
	Mode              string `json:"mode"`
	Domain            string `json:"domain"`
	Keywords          string `json:"keywords"`
	Topic             string `json:"topic"`
	Style             string `json:"style"`
	ScriptType        string `json:"script_type"`
	Duration          string `json:"duration"`
	DurationSec       int    `json:"duration_sec"`
	UserID            string `json:"user_id"`
	TemplateID        string `json:"template_id"`
	TemplateStructure string `json:"template_structure"`
	Persona           string `json:"persona"`
	PersonaType       string `json:"persona_type"` // e.g. expert/friend/humor/student
}
