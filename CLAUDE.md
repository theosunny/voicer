# 口播小程序 (Koubo) — Claude Code 工作指南

AI 口播文案生成 + 录制的微信小程序。用户选模板或自由创作，AI 生成口播稿，录制后提交处理。

## 项目结构

```
voicer/
├── docs/startup.md           # 本地手动启动详细步骤
├── koubo-backend/            # Go + Hertz API (:8080)
│   ├── main.go               # 路由注册 + 服务初始化
│   ├── config/config.go      # 环境变量加载（含 AGENT_BASE_URL）
│   ├── handler/              # HTTP 处理层
│   │   ├── script.go         # 文案生成(SSE)、草稿保存、列表查询
│   │   ├── video.go          # 视频提交、状态查询
│   │   ├── template.go       # 模板浏览
│   │   └── auth.go           # 用户鉴权
│   ├── service/              # 业务逻辑
│   │   ├── script.go         # Prompt 构建 + DeepSeek SSE 直连
│   │   ├── agent.go          # 千面 Agent 代理（EnsureRole/Persona/GenerateStream）
│   │   ├── video.go          # FFmpeg 处理
│   │   └── asr.go            # 语音识别
│   ├── repo/                 # GORM 数据访问
│   │   ├── script.go         # Create / Update / GetByID / List
│   │   ├── template.go       # 模板 CRUD + 使用计数
│   │   ├── video.go          # 视频记录
│   │   └── user.go           # 用户
│   ├── model/                # 数据模型（GORM + JSON tag）
│   ├── worker/               # Asynq 任务队列 + FFmpeg
│   ├── db/migrations/        # SQL 迁移文件
│   ├── docker-compose.yml    # PostgreSQL + Redis + API 一键部署
│   ├── .env                  # 本地环境变量（不提交）
│   └── uploads/              # 本地文件存储
└── koubo-frontend/           # Taro 4.x 微信小程序 (TypeScript + SCSS)
    └── src/
        ├── pages/
        │   ├── index/        # 首页：模板浏览 + 快速生成 bottom sheet
        │   ├── script/       # generate.tsx（AI 生成）+ edit.tsx（编辑）
        │   ├── videos/       # 作品页（文案草稿 tab + 视频 tab）
        │   ├── record/       # 录制页
        │   ├── video/        # 视频状态页
        │   ├── create/       # 创作引导
        │   ├── login/        # 登录
        │   └── profile/      # 个人中心
        ├── components/       # chip, glow-button, hud-card, step-progress, toast, icon
        ├── hooks/            # useSSE, useASRSocket, useVideoPoller
        ├── api/              # client.ts, script.ts, video.ts, user.ts
        ├── types/api.ts      # 所有请求/响应类型定义
        └── styles/           # tokens.scss, global.scss
```

## 启动方式

### 首选：Docker Compose

```bash
cd koubo-backend
cp .env.example .env   # 填入 LLM_API_KEY
docker compose up -d
curl http://localhost:8080/health
```

### 本地手动启动

```bash
export LD_LIBRARY_PATH=$HOME/local/lib:$LD_LIBRARY_PATH
export PATH=$HOME/go/bin:$HOME/local/bin:$PATH

pg_ctl -D ~/pgdata -l ~/pgdata/logfile start          # PostgreSQL :5433
redis-server --daemonize yes --port 6379               # Redis :6379

cd koubo-backend
set -a && source .env && set +a
~/go/bin/go build -o koubo-server .                   # 每次改后端代码必须重新 build
nohup ./koubo-server > /tmp/koubo-server.log 2>&1 &

cd ../koubo-frontend
npm run build:weapp                                    # 构建微信小程序
```

**重要**：Go 源码改动后必须重新 `go build` 并重启进程，否则仍运行旧二进制。

重启后端：
```bash
fuser -k 8080/tcp
nohup ./koubo-server > /tmp/koubo-server.log 2>&1 &
```

## 环境变量（koubo-backend/.env）

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5433/koubo?sslmode=disable` |
| `REDIS_URL` | `localhost:6379` |
| `LLM_API_KEY` | DeepSeek API Key |
| `LLM_BASE_URL` | DeepSeek API Base URL |
| `AGENT_BASE_URL` | 千面 Agent 地址，如 `http://localhost:8000`（可选，缺省走直连 LLM） |

## API 路由

```
GET  /health
POST /api/script/generate       # SSE 流式生成（或 ?stream=0 JSON fallback）
POST /api/script/draft          # 保存草稿
GET  /api/script/:id            # 查询单篇文案
GET  /api/scripts               # 文案列表（?limit=20&offset=0）
GET  /api/templates             # 模板列表
POST /api/video/submit          # 提交视频处理
GET  /api/video/status/:id      # 查询处理状态
```

## AI 生成流程

1. 前端 POST `/api/script/generate`，携带 `topic`、`persona_type`、`user_id` 等
2. 若 `AGENT_BASE_URL` 已配置：后端调千面 Agent（双层记忆），SSE 透传前端
3. 若未配置：直连 DeepSeek SSE，返回同样格式
4. 生成完成后自动保存至数据库，返回 `script_id`

**人设 slug 规则**：`{user_id}-{persona_type}`（如 `user123-friend`），base 层用 `{user_id}-base`。

## 前端关键约定

- 微信开发者工具不支持 `enableChunked`，生成页自动走 `?stream=0` JSON fallback
- `user_id` 存于 `Taro.getStorageSync('user_id')`
- 人设类型值：`expert` / `student` / `friend` / `humor`（传给后端的是 value，不是中文 label）
- 时长值：`30s` / `60s` / `3min` / `custom`（custom 时前端额外传 `duration_sec`）

## 已知限制

- 微信开发者工具不支持摄像头（真机才有视频录制）
- WebSocket ASR 仅在真机可用
- Docker Desktop 需手动为当前 WSL distro 开启集成
