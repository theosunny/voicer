package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

type FrameMarker struct {
	ParagraphIndex int `json:"paragraph_index"` // frontend sends this
	WordIndex      int `json:"word_index"`      // frontend sends this
	TimestampMs    int `json:"timestamp_ms"`    // frontend sends this
	TextPos        int `json:"text_pos"`        // legacy
	VideoTimestampMs int `json:"video_timestamp_ms"` // legacy
}

// FrameMarkers is a GORM custom type for []FrameMarker stored as JSONB.
type FrameMarkers []FrameMarker

func (f FrameMarkers) Value() (driver.Value, error) {
	if f == nil {
		return "[]", nil
	}
	b, err := json.Marshal(f)
	return string(b), err
}

func (f *FrameMarkers) Scan(value any) error {
	var b []byte
	switch v := value.(type) {
	case []byte:
		b = v
	case string:
		b = []byte(v)
	default:
		return fmt.Errorf("unsupported type: %T", value)
	}
	return json.Unmarshal(b, f)
}

type Video struct {
	ID                string       `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID            string       `gorm:"type:uuid;not null" json:"user_id"`
	ScriptID          *string      `gorm:"type:uuid" json:"script_id"`
	RawVideoURL       string       `gorm:"type:text" json:"raw_video_url"`
	ProcessedVideoURL string       `gorm:"type:text" json:"processed_video_url"`
	FrameMarkers      FrameMarkers `gorm:"type:jsonb;not null;default:'[]'" json:"frame_markers"`
	ASRResult         string       `gorm:"type:text;not null;default:''" json:"asr_result"`
	Status            string       `gorm:"size:16;not null;default:'processing'" json:"status"`
	ErrorMsg          string       `gorm:"type:text" json:"error_msg"`
	CreatedAt         time.Time    `json:"created_at"`
	CompletedAt       *time.Time   `json:"completed_at"`
}

func (Video) TableName() string { return "videos" }

type VideoSubmitRequest struct {
	ScriptID     string       `json:"script_id"`
	FrameMarkers FrameMarkers `json:"frame_markers"`
	ASRResult    string       `json:"asr_result"`
}

type VideoStatusResponse struct {
	Status            string `json:"status"`
	ProcessedVideoURL string `json:"processed_video_url,omitempty"`
	ErrorMsg          string `json:"error_msg,omitempty"`
}
