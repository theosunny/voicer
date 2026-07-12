package service

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// AgentService calls the qianmian-agent API to generate script content.
// It creates tasks via POST /api/v1/tasks and streams output via SSE.
type AgentService struct {
	BaseURL string // e.g. http://localhost:8000
}

func NewAgentService(baseURL string) *AgentService {
	return &AgentService{BaseURL: baseURL}
}

type createTaskReq struct {
	Role    string `json:"role"`
	Persona string `json:"persona"`
	Task    string `json:"task"`
	Model   string `json:"model,omitempty"`
}

type createTaskResp struct {
	Code int `json:"code"`
	Data struct {
		TaskID string `json:"task_id"`
	} `json:"data"`
}

// EnsureRole creates the role if it does not exist. Idempotent.
func (s *AgentService) EnsureRole(ctx context.Context, slug, name, description string) error {
	body, _ := json.Marshal(map[string]string{
		"slug":        slug,
		"name":        name,
		"description": description,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.BaseURL+"/api/v1/roles", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()
	return nil
}

// EnsurePersona creates the persona under a role if it does not exist. Idempotent.
func (s *AgentService) EnsurePersona(ctx context.Context, roleSlug, personaSlug, name, brief string) error {
	body, _ := json.Marshal(map[string]string{
		"slug":  personaSlug,
		"name":  name,
		"brief": brief,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		fmt.Sprintf("%s/api/v1/roles/%s/personas", s.BaseURL, roleSlug),
		bytes.NewReader(body),
	)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()
	return nil
}

// GenerateStream submits a task and streams its SSE output into chunkCh.
// The role and persona slugs must already exist before calling this.
func (s *AgentService) GenerateStream(ctx context.Context, roleSlug, personaSlug, task string, chunkCh chan<- string) error {
	// 1. Create task
	body, _ := json.Marshal(createTaskReq{
		Role:    roleSlug,
		Persona: personaSlug,
		Task:    task,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.BaseURL+"/api/v1/tasks", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	var createResp createTaskResp
	if err := json.Unmarshal(raw, &createResp); err != nil || createResp.Code != 0 {
		return fmt.Errorf("agent create task failed: %s", string(raw))
	}
	taskID := createResp.Data.TaskID

	// 2. Stream output via SSE
	streamReq, err := http.NewRequestWithContext(ctx, http.MethodGet,
		fmt.Sprintf("%s/api/v1/tasks/%s/stream", s.BaseURL, taskID), nil)
	if err != nil {
		return err
	}
	streamReq.Header.Set("Accept", "text/event-stream")

	// Retry up to 3s waiting for task to be ready
	var streamResp *http.Response
	for i := 0; i < 6; i++ {
		streamResp, err = http.DefaultClient.Do(streamReq)
		if err == nil {
			break
		}
		time.Sleep(500 * time.Millisecond)
	}
	if err != nil {
		return fmt.Errorf("agent stream connect failed: %w", err)
	}
	defer streamResp.Body.Close()

	scanner := bufio.NewScanner(streamResp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := strings.TrimPrefix(line, "data: ")
		var evt struct {
			Content string `json:"content"`
			Status  string `json:"status"`
			Error   string `json:"error"`
			Message string `json:"message"`
		}
		if err := json.Unmarshal([]byte(data), &evt); err != nil {
			continue
		}
		if evt.Error != "" || evt.Message != "" {
			msg := evt.Error
			if msg == "" {
				msg = evt.Message
			}
			return fmt.Errorf("agent error: %s", msg)
		}
		if evt.Content != "" {
			select {
			case chunkCh <- evt.Content:
			case <-ctx.Done():
				return ctx.Err()
			}
		}
		if evt.Status == "done" {
			return nil
		}
	}
	return scanner.Err()
}
