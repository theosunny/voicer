#!/usr/bin/env bash
# ============================================================
# 口播小程序 · 一键部署脚本
# Usage:
#   ./scripts/deploy.sh [dev|prod|docker]
#
#   dev     — 本地开发模式（PostgreSQL + Redis 需已运行）
#   docker  — Docker Compose 全栈部署
#   prod    — 生产环境 systemd 部署（仅 Linux）
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/koubo-backend"
FRONTEND_DIR="$PROJECT_ROOT/koubo-frontend"
MODE="${1:-dev}"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"

# ---- colour helpers ----
red()    { printf '\033[31m%s\033[0m\n' "$*"; }
green()  { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
blue()   { printf '\033[34m%s\033[0m\n' "$*"; }
die()    { red "ERROR: $*"; exit 1; }

# ---- pre-flight checks ----
check_cmd() {
  command -v "$1" &>/dev/null || die "$1 is not installed. Please install it first."
}

check_env_file() {
  if [ ! -f "$BACKEND_DIR/.env" ]; then
    yellow "No .env found in $BACKEND_DIR — creating from .env.example"
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    red ">>> IMPORTANT: Edit $BACKEND_DIR/.env with your real API keys before proceeding!"
    return 1
  fi
}

# ============================================================
#  dev  — start backend locally (psql + redis must be running)
# ============================================================
deploy_dev() {
  blue ">>> Deploying LOCAL DEV mode …"

  check_cmd go
  check_cmd node

  # --- backend ---
  blue "[1/3] Building backend …"
  cd "$BACKEND_DIR"
  set -a && source .env && set +a
  go build -ldflags="-s -w" -o koubo-server . || die "go build failed"

  # kill old process if running
  pkill koubo-server 2>/dev/null || true
  sleep 1

  green "[2/3] Starting backend on :${PORT:-8080} …"
  nohup ./koubo-server > /tmp/koubo-server.log 2>&1 &
  sleep 2

  if curl -sf http://127.0.0.1:${PORT:-8080}/health > /dev/null; then
    green "  ✓ Backend healthy at http://127.0.0.1:${PORT:-8080}"
  else
    red "  ✗ Backend failed to start — check /tmp/koubo-server.log"
    return 1
  fi

  # --- frontend ---
  blue "[3/3] Building frontend (weapp) …"
  cd "$FRONTEND_DIR"
  npm install --silent 2>&1 | tail -1
  rm -rf dist
  npm run build:weapp || die "Frontend build failed"
  green "  ✓ Frontend built → $FRONTEND_DIR/dist/"

  green "==========================================="
  green "  Dev deploy complete!"
  green "  Backend  : http://127.0.0.1:${PORT:-8080}"
  green "  Frontend : $FRONTEND_DIR/dist/"
  green "  Open in WeChat DevTools → import $FRONTEND_DIR"
  green "==========================================="
}

# ============================================================
#  docker — docker compose full stack
# ============================================================
deploy_docker() {
  blue ">>> Deploying DOCKER mode …"

  check_cmd docker
  check_env_file || die "Set up .env first"

  cd "$BACKEND_DIR"

  # export LLM_API_KEY so docker-compose can pick it up
  set -a && source .env && set +a

  blue "[1/2] Building & starting containers …"
  docker compose up --build -d || die "docker compose up failed"

  sleep 3

  blue "[2/2] Health check …"
  if docker compose exec -T api curl -sf http://localhost:8080/health > /dev/null 2>&1; then
    green "  ✓ All containers healthy"
  else
    yellow "  ⚠ API container may still be starting — check with: docker compose logs api"
  fi

  green "==========================================="
  green "  Docker deploy complete!"
  green "  API       : http://localhost:8080"
  green "  PostgreSQL: localhost:5432"
  green "  Redis     : localhost:6379"
  green "  Logs      : docker compose logs -f"
  green "==========================================="
}

# ============================================================
#  prod — systemd service (Linux only, for VPS/cloud)
# ============================================================
deploy_prod() {
  blue ">>> Deploying PROD mode (systemd) …"

  [ "$(uname -s)" = "Linux" ] || die "prod mode only works on Linux"
  check_cmd go
  check_env_file || die "Set up .env first"

  SERVICE_NAME="koubo-api"
  DEPLOY_DIR="/opt/koubo"
  USER="${KBO_DEPLOY_USER:-$(whoami)}"
  GROUP="${KBO_DEPLOY_GROUP:-$USER}"

  blue "[1/4] Building binary …"
  cd "$BACKEND_DIR"
  set -a && source .env && set +a
  go build -ldflags="-s -w" -o koubo-server . || die "go build failed"

  blue "[2/4] Installing to $DEPLOY_DIR …"
  sudo mkdir -p "$DEPLOY_DIR" "$DEPLOY_DIR/db/migrations"
  sudo cp koubo-server "$DEPLOY_DIR/"
  sudo cp -r db/migrations "$DEPLOY_DIR/db/"
  sudo chown -R "$USER:$GROUP" "$DEPLOY_DIR"

  # copy .env to deploy dir (strip sensitive placeholders)
  sudo cp "$BACKEND_DIR/.env" "$DEPLOY_DIR/.env"
  sudo chmod 600 "$DEPLOY_DIR/.env"

  blue "[3/4] Creating systemd service …"
  sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=Koubo API Server
After=network.target postgresql.service redis.service
Wants=network.target

[Service]
Type=simple
User=$USER
Group=$GROUP
WorkingDirectory=$DEPLOY_DIR
EnvironmentFile=$DEPLOY_DIR/.env
ExecStart=$DEPLOY_DIR/koubo-server
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable "$SERVICE_NAME"

  blue "[4/4] Starting service …"
  sudo systemctl restart "$SERVICE_NAME"
  sleep 2

  if systemctl is-active --quiet "$SERVICE_NAME"; then
    green "  ✓ Service running: systemctl status $SERVICE_NAME"
  else
    red "  ✗ Service failed — journalctl -u $SERVICE_NAME -n 50"
    return 1
  fi

  green "==========================================="
  green "  Production deploy complete!"
  green "  Status : systemctl status $SERVICE_NAME"
  green "  Logs   : journalctl -u $SERVICE_NAME -f"
  green "==========================================="
}

# ============================================================
#  main
# ============================================================
case "$MODE" in
  dev)    deploy_dev ;;
  docker) deploy_docker ;;
  prod)   deploy_prod ;;
  *)
    red "Unknown mode: $MODE"
    echo "Usage: $0 [dev|docker|prod]"
    exit 1
    ;;
esac
