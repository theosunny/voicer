# 口播小程序 (Koubo)

AI 口播文案生成 + 录制的微信小程序。

## 项目结构

```
voicer/
├── docs/startup.md           # 启动指南（必读）
├── koubo-backend/            # Go + Hertz API (:8080)
│   ├── main.go
│   ├── handler/              # API handlers
│   ├── service/              # 业务逻辑 (LLM, ASR, Video)
│   ├── repo/                 # GORM DB 操作
│   ├── worker/               # Asynq 任务队列 + FFmpeg
│   ├── model/                # 数据模型
│   ├── db/migrations/        # SQL 迁移
│   ├── docker-compose.yml    # Docker 全栈部署
│   └── uploads/              # 本地文件存储
└── koubo-frontend/           # Taro 4.x 微信小程序
    └── src/
        ├── pages/            # 8 个页面
        ├── components/       # 通用组件
        ├── hooks/            # useSSE, useASRSocket, useVideoPoller
        └── styles/           # tokens.scss, global.scss
```

## 启动方式（当前 WSL2 环境）

见 `docs/startup.md` 完整文档。核心命令：

```bash
# 环境变量
export LD_LIBRARY_PATH=$HOME/local/lib:$LD_LIBRARY_PATH
export PATH=$HOME/local/bin:$HOME/go/bin:$PATH

# 启动 PostgreSQL (端口 5433, 数据目录 ~/pgdata)
pg_ctl -D ~/pgdata -l ~/pgdata/logfile start

# 启动 Redis (端口 6379)
redis-server --daemonize yes --port 6379 --logfile /tmp/redis.log

# 启动后端 (端口 8080)
cd koubo-backend
set -a && source .env && set +a
nohup ./koubo-server &>/tmp/koubo-server.log &

# 编译前端
cd koubo-frontend && npm run build:weapp
```

**注意**：Go 编译器在 `~/go/bin/go`，不是系统 PATH。后端二进制 `koubo-server` 已预编译，改动代码后需重新 `go build`。

## 环境变量 (.env)

- `DATABASE_URL=postgres://postgres:postgres@localhost:5433/koubo?sslmode=disable`
- `REDIS_URL=localhost:6379`
- `LLM_API_KEY` + `LLM_BASE_URL` — DeepSeek API
- ASR 和 OSS 目前为占位符

## 前后端端口

- 后端：`http://127.0.0.1:8080`
- 健康检查：`curl http://127.0.0.1:8080/health`
- 微信开发者工具从 Windows 端通过 `localhost:8080` 访问 WSL 后端

## 已有功能

- AI 文案生成（DeepSeek SSE，开发者工具用 `?stream=0` JSON fallback）
- 文案编辑 + 保存草稿
- 录制（真机摄像头 → mp4，模拟器 → mp3）
- 提交处理（Asynq worker，MVP 阶段直接复制原文件）
- 作品列表（从 PostgreSQL 拉取）
- 模板浏览

## 已知限制

- 微信开发者工具不支持摄像头（真机才有视频）
- 开发者工具不支持 `enableChunked`（生成页走 JSON fallback）
- WebSocket ASR 语音追踪仅在真机可用
- 无 Docker Desktop（WSL2 可直接运行，但未安装 Docker）
