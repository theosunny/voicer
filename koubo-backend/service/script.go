package service

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"koubo-backend/model"
	"net/http"
	"strings"
)

type ScriptService struct {
	APIKey  string
	BaseURL string
}

func NewScriptService(apiKey, baseURL string) *ScriptService {
	return &ScriptService{APIKey: apiKey, BaseURL: baseURL}
}

func (s *ScriptService) BuildPrompt(req model.ScriptGenerateRequest) string {
	styleMap := map[string]string{
		"casual":       "轻松口语化",
		"professional": "专业权威",
		"emotional":    "情感共鸣",
	}
	typeMap := map[string]string{
		"promo":   "产品推广",
		"insight": "个人感悟",
		"life":    "生活分享",
	}
	styleName := styleMap[req.Style]
	if styleName == "" {
		styleName = "自然流畅"
	}
	typeName := typeMap[req.ScriptType]
	if typeName == "" {
		typeName = "通用"
	}

	if req.Mode == "domain" {
		return fmt.Sprintf(
			"你是一位专业的口播文案创作者。请为【%s】领域创作一段%d秒的%s风格口播文案，围绕关键词：%s。内容类型：%s。要求：自然流畅，适合口播朗读，分段清晰，每段不超过50字。直接输出文案内容，不要加标题或说明。",
			req.Domain, req.DurationSec, styleName, req.Keywords, typeName,
		)
	}
	return fmt.Sprintf(
		"你是一位专业的口播文案创作者。请创作一段%d秒的%s风格口播文案，主题：%s。内容类型：%s。要求：自然流畅，适合口播朗读，分段清晰，每段不超过50字。直接输出文案内容，不要加标题或说明。",
		req.DurationSec, styleName, req.Topic, typeName,
	)
}

// GenerateStream calls LLM API with streaming and sends chunks to chunkCh.
// Returns when streaming is complete or context is cancelled.
func (s *ScriptService) GenerateStream(ctx context.Context, prompt string, chunkCh chan<- string) error {
	body, _ := json.Marshal(map[string]any{
		"model":  "doubao-pro-4k",
		"stream": true,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.BaseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.APIKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := strings.TrimPrefix(line, "data: ")
		if data == "[DONE]" {
			break
		}
		var payload struct {
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
			} `json:"choices"`
		}
		if err := json.Unmarshal([]byte(data), &payload); err != nil {
			continue
		}
		if len(payload.Choices) > 0 {
			chunk := payload.Choices[0].Delta.Content
			if chunk != "" {
				select {
				case chunkCh <- chunk:
				case <-ctx.Done():
					return ctx.Err()
				}
			}
		}
	}
	return scanner.Err()
}

func EstimateDuration(content string) int {
	runes := []rune(strings.TrimSpace(content))
	secs := len(runes) / 4
	if secs < 1 {
		secs = 1
	}
	return secs
}

func BuildSSEChunk(content string) string {
	b, _ := json.Marshal(map[string]string{"type": "chunk", "content": content})
	return "data: " + string(b) + "\n\n"
}

func BuildSSEDone(scriptID string) string {
	b, _ := json.Marshal(map[string]string{"type": "done", "script_id": scriptID})
	return "data: " + string(b) + "\n\n"
}

func BuildSSEError(msg string) string {
	b, _ := json.Marshal(map[string]string{"type": "error", "message": msg})
	return "data: " + string(b) + "\n\n"
}
