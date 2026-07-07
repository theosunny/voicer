# 口播小程序 · 部署指南

> 最后更新: 2026-07-08

---

## 快速开始

### Docker Compose（推荐）

```bash
cd koubo-backend
cp .env.example .env
# 编辑 .env，填入 LLM_API_KEY

docker compose up -d
curl http://localhost:8080/health   # → {"status":"ok"}
```

这会启动 PostgreSQL、Redis、API 三个容器。Worker 与 API 在同一进程中运行。

### 本地开发

```bash
# 1. 启动 PostgreSQL + Redis（Docker 或手动）
cd koubo-backend && docker compose up -d postgres redis

# 2. 编译并启动后端
cd koubo-backend
cp .env.example .env   # 编辑填入 LLM_API_KEY
go build -o koubo-server .
set -a && source .env && set +a
./koubo-server

# 3. 编译前端
cd ../koubo-frontend
npm install
npm run build:weapp
```

---

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/api/templates/trending` | 热门模板 |
| POST | `/api/script/generate` | 生成文案（`?stream=0` 关闭 SSE） |
| POST | `/api/script/draft` | 保存草稿 |
| GET | `/api/script/:id` | 获取文案 |
| POST | `/api/video/submit` | 提交录音/视频 |
| GET | `/api/video/:id/status` | 查询处理状态 |
| GET | `/api/videos` | 作品列表 |
| GET | `/uploads/:file` | 静态文件 |

---

## 微信开发者工具

1. 导入项目 → 选择 `koubo-frontend/` 目录
2. AppID 选择 **测试号**
3. 详情 → 本地设置 勾选：
   - ✅ 不校验合法域名
   - ✅ 不校验 web-view 业务域名
   - ✅ 不校验 TLS 版本

> WSL2 需在 `C:\Users\<you>\.wslconfig` 配置 `networkingMode=mirrored`
