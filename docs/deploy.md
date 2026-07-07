# 口播小程序 · 部署指南

> 最后更新: 2026-07-08

---

## 方式一：Docker Compose（推荐）

```bash
cd koubo-backend

# 1. 配置
cp .env.example .env
vim .env   # 修改 LLM_API_KEY 为你的 DeepSeek Key

# 2. 启动（PostgreSQL + Redis + API）
docker compose up -d

# 3. 验证
curl http://localhost:8080/health      # → {"status":"ok"}
curl http://localhost:8080/api/templates/trending   # → 5 条模板
```

| 服务 | 镜像 | 端口 |
|------|------|------|
| PostgreSQL 16 | `postgres:16-alpine` | 5432 |
| Redis 7 | `redis:7-alpine` | 6379 |
| API | 本地 Dockerfile | 8080 |

Worker（Asynq 任务队列）运行在 API 同一进程内，无需独立容器。

### 常用命令

```bash
docker compose up -d              # 启动
docker compose logs -f api        # 查看日志
docker compose ps                 # 状态
docker compose restart api        # 重启 API
docker compose down               # 停止 + 清理
docker compose down -v            # 停止 + 清理数据卷
```

---

## 方式二：本地开发（无 Docker）

详见 `docs/startup.md`

---

## 前端编译

```bash
cd koubo-frontend
npm install
npm run build:weapp    # 产物在 dist/
```

---

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/api/templates/trending` | 热门模板 |
| POST | `/api/script/generate` | 生成文案 (`?stream=0` JSON) |
| POST | `/api/script/draft` | 保存草稿 |
| GET | `/api/script/:id` | 获取文案 |
| POST | `/api/video/submit` | 提交录音/视频 |
| GET | `/api/video/:id/status` | 处理状态 |
| GET | `/api/videos` | 作品列表 |
| GET | `/uploads/:file` | 文件下载 |
