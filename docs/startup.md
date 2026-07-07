# 口播小程序 · 启动指南

> 当前环境：WSL2 (Ubuntu 24.04) · 无 Docker · 手动本地部署
> 最后更新: 2026-07-08

---

## 环境速查

| 组件 | 位置 | 端口 |
|------|------|------|
| PostgreSQL 16 | `~/local/bin/` | 5433 |
| Redis 7 | `~/local/bin/` | 6379 |
| Go 1.26 | `~/go/bin/go` | — |
| Node.js 24 | `/usr/bin/node` | — |
| PG 数据目录 | `~/pgdata/` | — |
| 后端代码 | `koubo-backend/` | 8080 |
| 前端代码 | `koubo-frontend/` | — |

---

## 一键启动（当前环境）

```bash
# === 必须设置环境变量 ===
export LD_LIBRARY_PATH=$HOME/local/lib:$LD_LIBRARY_PATH
export PATH=$HOME/local/bin:$HOME/go/bin:$PATH

# === 1. 启动 PostgreSQL ===
pg_ctl -D ~/pgdata -l ~/pgdata/logfile start

# === 2. 启动 Redis ===
redis-server --daemonize yes --port 6379 --logfile /tmp/redis.log

# === 3. 启动后端 ===
cd /home/theofan/ai_project/voicer/voicer/koubo-backend
set -a && source .env && set +a
pkill koubo-server 2>/dev/null; sleep 1
nohup ./koubo-server &>/tmp/koubo-server.log &
sleep 2
curl -s http://127.0.0.1:8080/health   # → {"status":"ok"}

# === 4. 编译前端 ===
cd /home/theofan/ai_project/voicer/voicer/koubo-frontend
npm run build:weapp
```

---

## 一键停止

```bash
pkill koubo-server
pg_ctl -D ~/pgdata stop
pkill redis-server
```

---

## 健康检查

```bash
# 后端
curl -s http://127.0.0.1:8080/health
# → {"status":"ok"}

# 模板 API
curl -s http://127.0.0.1:8080/api/templates/trending

# 作品列表
curl -s http://127.0.0.1:8080/api/videos

# PostgreSQL
LD_LIBRARY_PATH=$HOME/local/lib ~/local/bin/pg_isready -h localhost -p 5433 -U postgres

# Redis
~/local/bin/redis-cli ping
# → PONG
```

---

## Docker Compose（备选，需要 Docker Desktop）

```bash
cd koubo-backend
cp .env.example .env   # 填入 LLM_API_KEY
docker compose up -d
```

---

## 微信开发者工具

1. 导入项目 → 选择 `koubo-frontend/` 目录
2. AppID → **测试号**
3. 详情 → 本地设置 → 勾选「不校验合法域名」
4. 编译预览

> WSL2 用户需在 `C:\Users\<用户名>\.wslconfig` 加 `networkingMode=mirrored`
