package service

import (
	"koubo-backend/model"
	"strings"
	"testing"
)

func TestBuildPrompt_DomainMode(t *testing.T) {
	svc := NewScriptService("key", "http://example.com")
	req := model.ScriptGenerateRequest{
		Mode:        "domain",
		Domain:      "美妆",
		Keywords:    "防晒霜",
		Style:       "casual",
		ScriptType:  "promo",
		DurationSec: 60,
	}
	prompt := svc.BuildPrompt(req)
	if !strings.Contains(prompt, "美妆") {
		t.Error("prompt should contain domain")
	}
	if !strings.Contains(prompt, "防晒霜") {
		t.Error("prompt should contain keywords")
	}
	if !strings.Contains(prompt, "60") {
		t.Error("prompt should contain duration")
	}
}

func TestBuildPrompt_FreeMode(t *testing.T) {
	svc := NewScriptService("key", "http://example.com")
	req := model.ScriptGenerateRequest{
		Mode:        "free",
		Topic:       "坚持的力量",
		Style:       "emotional",
		ScriptType:  "insight",
		DurationSec: 30,
	}
	prompt := svc.BuildPrompt(req)
	if !strings.Contains(prompt, "坚持的力量") {
		t.Error("prompt should contain topic")
	}
}

func TestEstimateDuration(t *testing.T) {
	content := strings.Repeat("字", 120) // 120 chars / 4 = 30s
	d := EstimateDuration(content)
	if d != 30 {
		t.Errorf("expected 30, got %d", d)
	}
}
