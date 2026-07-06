# 口播小程序 · 部署指南

> 最后更新: 2026-07-07  
> 适用环境: Linux / macOS / WSL2

---

## 架构概览

```
┌──────────────────────────────────────────────┐
│  微信开发者工具                                 │
│  koubo-frontend/dist/                         │
│  API → http://127.0.0.1:8080                  │
└──────────────────┬───────────────────────────┘
                   │ HTTP (CORS enabled)
┌──────────────────▼───────────────────────────┐
│  Go + Hertz API Server (:8080)                │
│  ├─ POST /api/script/generate → DeepSeek SSE │
│  ├─ POST /api/script/draft                   │
│  ├─ GET  /api/script/:id                     │
│  ├─ WS   /api/asr/stream                     │
│  ├─ POST /api/video/submit                   │
│  ├─ GET  /api/video/:id/status               │
│  └─ GET  /api/templates/trending             │
└──────┬──────────────────┬────────────────────┘
       │                  │
┌──────▼──────┐  ┌────────▼────────────────────┐
│  PostgreSQL │  │  Redis + Asynq (任务队列)    │
│  :5432/5433 │  │  :6379                     │
└─────────────┘  └────────┬────────────────────┘
                          │
                   ┌──────▼────────────────────┐
                   │  FFmpeg Worker             │
                   │  视频剪辑 / 字幕叠入        │
                   │  本地存储: uploads/         │
                   └───────────────────────────┘
```

---

## 方式一：一键部署脚本

```bash
# 开发模式（本地启动后端 + 编译前端）
bash scripts/deploy.sh dev

# Docker 全栈部署 (PostgreSQL + Redis + API + Worker)
bash scripts/deploy.sh docker

# 生产环境 systemd（仅 Linux）
bash scripts/deploy.sh prod
```

## 方式二：手动部署

### 1. 环境要求

| 组件 | 版本 | 用途 |
|------|------|------|
| Go | ≥ 1.23 | 编译后端 |
| Node.js | ≥ 18 | 编译前端 |
| PostgreSQL | 16 | 业务数据 |
| Redis | ≥ 7 | 任务队列 (Asynq) |
| FFmpeg | ≥ 6 | 视频处理 (生产环境才需要) |
| Docker + Compose | 最新 | (可选) 容器化部署 |

### 2. 配置 .env

```bash
cd koubo-backend
cp .env.example .env
# 编辑 .env，至少填入 LLM_API_KEY
```

| 变量 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `LLM_API_KEY` | ✅ | DeepSeek API Key | `sk-f8f7...` |
| `LLM_BASE_URL` | ✅ | LLM API 地址 | `https://api.deepseek.com` |
| `DATABASE_URL` | ✅ | PostgreSQL 连接串 | `postgres://postgres:postgres@localhost:5432/koubo?sslmode=disable` |
| `REDIS_URL` | ✅ | Redis 地址 | `localhost:6379` |
| `ASR_APP_ID` | ❌ | 火山引擎 ASR APP ID | — |
| `ASR_TOKEN` | ❌ | 火山引擎 ASR Token | — |
| `OSS_BUCKET` | ❌ | 阿里云 OSS Bucket | — |
| `PORT` | ❌ | API 端口 (默认 8080) | — |

### 3. 数据库初始化

```bash
# Docker Compose
cd koubo-backend && docker compose up -d postgres redis

# 或手动 PostgreSQL
createdb koubo
psql -d koubo -f db/migrations/001_init.sql

# 插入测试用户
psql -d koubo -c "
  INSERT INTO users (id, openid, platform, nickname)
  VALUES ('00000000-0000-0000-0000-000000000000', 'dev', 'wechat', '开发者');
"
```

### 4. 启动后端

```bash
cd koubo-backend
go build -o koubo-server .
set -a && source .env && set +a
./koubo-server

# 验证
curl http://127.0.0.1:8080/health   # → {"status":"ok"}
```

### 5. 编译前端

```bash
cd koubo-frontend
npm install
npm run build:weapp        # 微信小程序
# npm run build:tt         # 抖音小程序
```

### 6. 微信开发者工具

1. 打开微信开发者工具 → **导入项目**
2. 目录选 `koubo-frontend/`
3. AppID 选择 **测试号**
4. **详情 → 本地设置** 勾选：
   - ✅ 不校验合法域名
   - ✅ 不校验 web-view 业务域名
   - ✅ 不校验 TLS 版本
5. 点击 **编译** → 预览首页

> 💡 **WSL2 用户**: 确保 `C:\Users\<你>\.wslconfig` 有 `networkingMode=mirrored`，然后 `wsl --shutdown` 重启。

---

## 方式三：Docker Compose

```bash
cd koubo-backend
cp .env.example .env
# 编辑 LLM_API_KEY

docker compose up -d
docker compose logs -f api    # 查看日志
docker compose down           # 停止
```

---

## 真机扫码预览

1. 微信开发者工具右上角 → **预览** → 微信扫码
2. 真机首次启动需授权 **摄像头 + 麦克风**
3. 录制页上半屏自动显示前置摄像头画面

---

## 常见问题

### Q: 小程序调后端没反应？
**A:** 检查后端运行状态 `curl http://127.0.0.1:8080/health`，确认前端编译产物中 API_BASE 为 `127.0.0.1:8080`。

### Q: WSL2 网络不通？
**A:** `.wslconfig` 加 `networkingMode=mirrored` → `wsl --shutdown` → 重新打开终端。

### Q: WXSS 编译报错 `unexpected token '*'`？
**A:** 关闭开发者工具 → 删除 `%APPDATA%\Local\微信开发者工具\User Data\WeappCache` → 重新打开。

### Q: 生成文案报错？
**A:** `.env` 里的 `LLM_API_KEY` 是否有效？余额是否用完？

### Q: 摄像头不显示？
**A:** 开发者工具不支持摄像头。用真机扫码预览即可。

### Q: 保存草稿报错？
**A:** 需要后端已重启（包含 `POST /api/script/draft` 路由）。确认 `curl -X POST http://127.0.0.1:8080/api/script/draft -d '...'` 能通。

### Q: 提交视频报错？
**A:** 当前为本地 `uploads/` 存储，确认目录存在且可写。

---

## 目录结构

```
voicer/
├── scripts/deploy.sh            # 一键部署脚本
├── docs/
│   ├── deploy.md                # 本文档
│   ├── superpowers/
│   │   ├── specs/               # 产品设计文档
│   │   └── plans/               # 后端实现计划
│   └── ui-specs/                # 前端 UI 规格
├── koubo-backend/               # Go 后端
│   ├── main.go                  # 入口
│   ├── Dockerfile               # Docker 镜像
│   ├── docker-compose.yml       # 全栈编排
│   ├── .env.example             # 环境变量模板
│   ├── config/config.go         # 配置加载
│   ├── db/                      # DB 连接 + 迁移
│   ├── handler/                 # API handlers
│   ├── model/                   # 数据模型
│   ├── repo/                    # DB 操作
│   ├── service/                 # 业务逻辑 (LLM, ASR, Video)
│   ├── worker/                  # Asynq 任务 + FFmpeg
│   └── storage/oss.go           # OSS 客户端
└── koubo-frontend/              # Taro 前端
    ├── config/index.ts          # 编译配置 (API_BASE)
    ├── src/pages/               # 8 个页面
    ├── src/components/          # 5 个组件
    ├── src/api/                 # API 封装
    ├── src/hooks/               # SSE, ASR, VideoPoller
    └── src/styles/              # 主题 tokens
```
