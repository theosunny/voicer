#!/usr/bin/env bash
# 口播小程序一键部署脚本
# 用法: bash deploy.sh
set -euo pipefail

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/koubo-backend"
FRONTEND_DIR="$SCRIPT_DIR/koubo-frontend"

echo -e "${BOLD}==============================${NC}"
echo -e "${BOLD}  口播小程序 — 一键部署${NC}"
echo -e "${BOLD}==============================${NC}"

# ── 1. 依赖检查 ──────────────────────────────────────────────
info "检查依赖..."
command -v docker  >/dev/null 2>&1 || error "未找到 docker，请先安装 Docker Desktop 并开启 WSL 集成"
command -v node    >/dev/null 2>&1 || error "未找到 node，请先安装 Node.js >= 18"
command -v npm     >/dev/null 2>&1 || error "未找到 npm"
docker info >/dev/null 2>&1        || error "Docker 未运行，请启动 Docker Desktop"
info "依赖检查通过 ✓"

# ── 2. 环境变量配置 ───────────────────────────────────────────
ENV_FILE="$BACKEND_DIR/.env"
ENV_EXAMPLE="$BACKEND_DIR/.env.example"

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$ENV_EXAMPLE" ]]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    warn ".env 已从 .env.example 复制，请填写以下必填项："
  else
    cat > "$ENV_FILE" << 'EOF'
DATABASE_URL=postgres://postgres:postgres@postgres:5432/koubo?sslmode=disable
REDIS_URL=redis:6379
LLM_API_KEY=
LLM_BASE_URL=https://api.deepseek.com
AGENT_BASE_URL=
ASR_APP_ID=
ASR_TOKEN=
OSS_BUCKET=
OSS_REGION=cn-hangzhou
OSS_KEY_ID=
OSS_KEY_SECRET=
EOF
    warn ".env 已创建，请填写以下必填项："
  fi
  echo ""
  echo -e "  ${BOLD}必填：${NC}"
  echo "    LLM_API_KEY    — DeepSeek API Key（https://platform.deepseek.com）"
  echo ""
  echo -e "  ${BOLD}可选：${NC}"
  echo "    AGENT_BASE_URL — 千面 Agent 地址（如 http://localhost:8000），留空走直连 LLM"
  echo ""
  read -rp "已填写完毕？按 Enter 继续，Ctrl+C 退出..."
fi

# 校验 LLM_API_KEY
source "$ENV_FILE"
[[ -z "${LLM_API_KEY:-}" ]] && error ".env 中 LLM_API_KEY 未填写，部署中止"
info "环境变量加载完毕 ✓"

# ── 3. 后端：Docker Compose ───────────────────────────────────
info "启动后端服务（PostgreSQL + Redis + API）..."
cd "$BACKEND_DIR"
docker compose pull --quiet
docker compose up -d --build

info "等待服务就绪..."
RETRIES=30
until curl -sf http://localhost:8080/health >/dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  [[ $RETRIES -le 0 ]] && error "后端启动超时，请检查: docker compose logs api"
  sleep 2
done
info "后端就绪 http://localhost:8080 ✓"

# ── 4. 前端：构建微信小程序 ───────────────────────────────────
info "安装前端依赖..."
cd "$FRONTEND_DIR"
npm install --prefer-offline --no-audit --no-fund

info "构建微信小程序..."
npm run build:weapp

info "前端构建完成 ✓"

# ── 5. 完成 ───────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}部署完成！${NC}"
echo "────────────────────────────────"
echo "  后端 API:   http://localhost:8080"
echo "  健康检查:   curl http://localhost:8080/health"
echo "  查看日志:   cd koubo-backend && docker compose logs -f api"
echo ""
echo "  小程序产物: koubo-frontend/dist/weapp/"
echo "  用微信开发者工具打开该目录即可预览"
echo "────────────────────────────────"
