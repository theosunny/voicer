# 口播小程序 · 后端实现计划 (Phase 1 MVP)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建口播小程序 MVP 后端 API，支持文案 AI 生成（SSE）、ASR 实时代理（WebSocket）、视频异步剪辑（Asynq + FFmpeg）

**Architecture:** Go + Hertz 提供 HTTP/WebSocket API；Asynq + Redis 处理视频剪辑异步任务；FFmpeg Worker 完成剪辑和字幕叠入；PostgreSQL 存储业务数据；OSS 存储视频文件

**Tech Stack:** Go 1.22, cloudwego/hertz v0.9, asynq v0.24, pgx/v5, go-redis/v9, aliyun-oss-go-sdk v3, ffmpeg (os/exec)

---

## 文件结构

```
koubo-backend/
├── main.go                    # 服务入口，注册路由，启动 worker goroutine
├── go.mod
├── config/
│   └── config.go              # 从环境变量读取配置
├── db/
│   ├── db.go                  # pgx 连接池初始化
│   └── migrations/
│       └── 001_init.sql       # 建表 SQL
├── model/
│   ├── user.go
│   ├── script.go
│   ├── video.go
│   └── template.go
├── repo/
│   ├── user.go
│   ├── script.go
│   ├── video.go
│   └── template.go
├── handler/
│   ├── script.go              # POST /api/script/generate (SSE)
│   ├── asr.go                 # WS /api/asr/stream
│   ├── video.go               # POST /api/video/submit, GET /api/video/:id/status
│   └── template.go            # GET /api/templates/trending
├── service/
│   ├── script.go              # LLM API 调用，Prompt 构建
│   ├── asr.go                 # ASR 代理，滑动窗口文案匹配
│   └── video.go               # 入队 Asynq
├── worker/
│   ├── worker.go              # Asynq server 启动
│   └── ffmpeg.go              # FFmpeg 处理链
└── storage/
    └── oss.go                 # 阿里云 OSS 上传下载
```

---

## Task 1: 初始化 Go 模块 + Hertz 服务骨架

**Files:**
- Create: `koubo-backend/main.go`
- Create: `koubo-backend/go.mod`
- Create: `koubo-backend/config/config.go`

- [ ] **Step 1: 创建项目目录并初始化模块**

```bash
mkdir -p koubo-backend && cd koubo-backend
go mod init koubo-backend
mkdir -p config db/migrations model repo handler service worker storage
```

- [ ] **Step 2: 添加依赖**

```bash
go get github.com/cloudwego/hertz/pkg/app/server@v0.9.3
go get github.com/cloudwego/hertz/pkg/common/utils@v0.9.3
go get github.com/cloudwego/hertz/pkg/protocol/consts@v0.9.3
go get github.com/jackc/pgx/v5@v5.6.0
go get github.com/hibiken/asynq@v0.24.1
go get github.com/redis/go-redis/v9@v9.6.1
go get github.com/aliyun/aliyun-oss-go-sdk/v3@v3.0.2
go get github.com/hertz-contrib/websocket@v0.1.0
```

- [ ] **Step 3: 写 config/config.go**

```go
package config

import "os"

type Config struct {
	DatabaseURL    string
	RedisURL       string
	OSSBucket      string
	OSSRegion      string
	OSSKeyID       string
	OSSKeySecret   string
	LLMAPIKey      string
	LLMBaseURL     string
	ASRAppID       string
	ASRToken       string
	Port           string
}

func Load() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	return Config{
		DatabaseURL:  mustEnv("DATABASE_URL"),
		RedisURL:     mustEnv("REDIS_URL"),
		OSSBucket:    os.Getenv("OSS_BUCKET"),
		OSSRegion:    os.Getenv("OSS_REGION"),
		OSSKeyID:     os.Getenv("OSS_KEY_ID"),
		OSSKeySecret: os.Getenv("OSS_KEY_SECRET"),
		LLMAPIKey:    mustEnv("LLM_API_KEY"),
		LLMBaseURL:   mustEnv("LLM_BASE_URL"),
		ASRAppID:     os.Getenv("ASR_APP_ID"),
		ASRToken:     os.Getenv("ASR_TOKEN"),
		Port:         port,
	}
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic("missing required env: " + key)
	}
	return v
}
```

- [ ] **Step 4: 写 main.go 骨架**

```go
package main

import (
	"context"
	"koubo-backend/config"
	"koubo-backend/db"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main() {
	cfg := config.Load()

	pool, err := db.Init(cfg.DatabaseURL)
	if err != nil {
		panic(err)
	}
	defer pool.Close()

	h := server.Default(server.WithHostPorts(":" + cfg.Port))

	h.GET("/health", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{"status": "ok"})
	})

	api := h.Group("/api")
	_ = api // handlers registered in later tasks

	h.Spin()
}
```

- [ ] **Step 5: 验证编译通过**

```bash
go build ./...
```

Expected: 无报错输出

- [ ] **Step 6: Commit**

```bash
git init && git add .
git commit -m "feat: initialize go module with hertz skeleton"
```

---

## Task 2: 数据库初始化

**Files:**
- Create: `koubo-backend/db/migrations/001_init.sql`
- Create: `koubo-backend/db/db.go`

- [ ] **Step 1: 写 001_init.sql**

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openid      VARCHAR(128) NOT NULL,
  platform    VARCHAR(16)  NOT NULL CHECK (platform IN ('wechat','douyin')),
  nickname    VARCHAR(64),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_users_openid_platform ON users(openid, platform);

CREATE TABLE scripts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             VARCHAR(128) NOT NULL DEFAULT '',
  content           TEXT NOT NULL DEFAULT '',
  script_type       VARCHAR(16) NOT NULL CHECK (script_type IN ('promo','insight','life')),
  style             VARCHAR(32) NOT NULL DEFAULT 'normal',
  duration_estimate INT NOT NULL DEFAULT 0,
  status            VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE videos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  script_id           UUID REFERENCES scripts(id) ON DELETE SET NULL,
  raw_video_url       TEXT,
  processed_video_url TEXT,
  frame_markers       JSONB NOT NULL DEFAULT '[]',
  asr_result          TEXT NOT NULL DEFAULT '',
  status              VARCHAR(16) NOT NULL DEFAULT 'processing'
                        CHECK (status IN ('processing','completed','failed')),
  error_msg           TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

CREATE TABLE templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             VARCHAR(128) NOT NULL,
  domain            VARCHAR(64)  NOT NULL DEFAULT '',
  content_structure TEXT NOT NULL,
  usage_count       INT  NOT NULL DEFAULT 0,
  is_featured       BOOL NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO templates (title, domain, content_structure, is_featured) VALUES
  ('产品种草三段式', 'product', '开场钩子（提问痛点）+ 产品介绍（三大卖点）+ 行动号召（限时优惠）', true),
  ('情感共鸣分享', 'lifestyle', '引入场景（生活细节）+ 感悟展开（转折升华）+ 结尾共鸣（邀请互动）', true),
  ('干货知识科普', 'knowledge', '抛出问题（反直觉观点）+ 知识拆解（三步讲清楚）+ 总结金句', true),
  ('励志正能量', 'motivation', '困境描述（真实故事）+ 突破过程（具体行动）+ 激励收尾', false),
  ('美食探店打卡', 'food', '位置打卡（环境氛围）+ 菜品点评（口感细节）+ 推荐理由（适合人群）', false);
```

- [ ] **Step 2: 写 db/db.go**

```go
package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Init(dsn string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(context.Background()); err != nil {
		return nil, err
	}
	return pool, nil
}
```

- [ ] **Step 3: 运行迁移（需本地 PostgreSQL）**

```bash
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/koubo?sslmode=disable"
psql $DATABASE_URL -f db/migrations/001_init.sql
```

Expected: `CREATE TABLE` × 4, `INSERT 0 5`

- [ ] **Step 4: Commit**

```bash
git add db/
git commit -m "feat: add database schema and seed templates"
```

---

## Task 3: 文案生成 API (SSE)

**Files:**
- Create: `koubo-backend/model/script.go`
- Create: `koubo-backend/service/script.go`
- Create: `koubo-backend/repo/script.go`
- Create: `koubo-backend/handler/script.go`
- Modify: `koubo-backend/main.go`

- [ ] **Step 1: 写 model/script.go**

```go
package model

import "time"

type Script struct {
	ID               string    `json:"id"`
	UserID           string    `json:"user_id"`
	Title            string    `json:"title"`
	Content          string    `json:"content"`
	ScriptType       string    `json:"script_type"`
	Style            string    `json:"style"`
	DurationEstimate int       `json:"duration_estimate"`
	Status           string    `json:"status"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type ScriptGenerateRequest struct {
	Mode        string `json:"mode"`        // "domain" | "free"
	Domain      string `json:"domain"`      // mode=domain 时使用
	Keywords    string `json:"keywords"`
	Topic       string `json:"topic"`       // mode=free 时使用
	Style       string `json:"style"`       // "casual" | "professional" | "emotional"
	ScriptType  string `json:"script_type"` // "promo" | "insight" | "life"
	DurationSec int    `json:"duration_sec"`
	UserID      string `json:"user_id"`
}
```

- [ ] **Step 2: 写 service/script.go**

```go
package service

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
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

// GenerateStream calls LLM API with streaming and writes chunks to chunkCh.
// Sends empty string as sentinel when done, or closes chunkCh on error.
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

// FullContent reads all chunks from chunkCh into a single string.
func FullContent(chunks []string) string {
	return strings.Join(chunks, "")
}

// SplitParagraphs splits script content by newlines, filtering blanks.
func SplitParagraphs(content string) []string {
	var result []string
	for _, p := range strings.Split(content, "\n") {
		if t := strings.TrimSpace(p); t != "" {
			result = append(result, t)
		}
	}
	return result
}

// ParagraphDuration estimates seconds for a single paragraph.
func ParagraphDuration(para string) int {
	r := []rune(para)
	d := len(r) / 4
	if d < 1 {
		d = 1
	}
	return d
}

// BuildSSEChunk formats a chunk for SSE.
func BuildSSEChunk(content string) string {
	b, _ := json.Marshal(map[string]string{"type": "chunk", "content": content})
	return "data: " + string(b) + "\n\n"
}

// BuildSSEDone formats the done event for SSE.
func BuildSSEDone(scriptID string) string {
	b, _ := json.Marshal(map[string]string{"type": "done", "script_id": scriptID})
	return "data: " + string(b) + "\n\n"
}

// BuildSSEError formats an error event for SSE.
func BuildSSEError(msg string) string {
	b, _ := json.Marshal(map[string]string{"type": "error", "message": msg})
	return "data: " + string(b) + "\n\n"
}

var _ = io.EOF // suppress unused import

