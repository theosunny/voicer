# 口播创作小程序 (voicer)

一站式口播内容创作工具，支持 AI 文案生成、提词器录制、视频自动剪辑。

## 项目结构

```
voiceover/
├── koubo-backend/    # Go + Hertz API 服务
└── koubo-frontend/   # Taro 4 React 小程序（微信 + 抖音 + H5）
```

---

## 后端 (koubo-backend)

**技术栈：** Go 1.22, cloudwego/hertz, gorm, PostgreSQL, Redis/Asynq, FFmpeg, 阿里云 OSS

### 启动

```bash
cd koubo-backend
cp .env.example .env   # 填写环境变量
docker-compose up -d   # 启动 PostgreSQL + Redis
go run main.go
```

### 主要 API

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/script/generate` | SSE 流式生成文案 |
| WS | `/api/asr/stream` | 实时 ASR WebSocket |
| POST | `/api/video/submit` | 提交视频剪辑任务 |
| GET | `/api/video/:id/status` | 查询处理状态 |
| GET | `/api/templates/trending` | 爆款模板列表 |

### 环境变量

```
DATABASE_URL=postgres://...
REDIS_URL=redis://localhost:6379
LLM_API_KEY=...
LLM_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ASR_APP_ID=...
ASR_TOKEN=...
OSS_BUCKET=...
OSS_REGION=...
OSS_KEY_ID=...
OSS_KEY_SECRET=...
PORT=8080
```

---

## 前端 (koubo-frontend)

**技术栈：** Taro 4.2, React 18, TypeScript 5.4, SCSS

**设计系统：** Cyber Creator Studio — 深空黑 `#080810`，电子紫 `#6C63FF`，科技青 `#00E5FF`

### 开发

```bash
cd koubo-frontend
npm install

# 微信小程序（在微信开发者工具中打开 dist/）
npm run dev:weapp

# 抖音小程序
npm run dev:tt

# H5 Web（浏览器访问 localhost）
npm run dev:h5
```

### 构建

```bash
npm run build:weapp   # 微信小程序 → dist/
npm run build:tt      # 抖音小程序 → dist/
npm run build:h5      # H5 → dist/
npm run type-check    # TypeScript 类型检查
```

### 目录结构

```
src/
├── app.tsx / app.config.ts   # 入口 + 路由配置
├── styles/                   # 设计 token、全局样式、mixin
├── components/               # 共享组件
│   ├── hud-card/             # HUD 四角发光卡片
│   ├── chip/                 # 可选标签
│   ├── glow-button/          # 发光按钮
│   ├── toast/                # 全局提示
│   └── step-progress/        # 步骤进度
├── api/                      # REST + 文件上传封装
├── hooks/                    # useSSE / useASRSocket / useVideoPoller
├── pages/                    # 8 个页面
│   ├── index/                # 首页 / 爆款模板
│   ├── create/               # 创作中枢
│   ├── script/generate       # AI 文案生成（终端流式动效）
│   ├── script/edit           # 文案编辑
│   ├── record/               # 提词器 + 录制
│   ├── video/status          # 视频处理状态
│   ├── videos/               # 我的作品
│   └── profile/              # 个人中心
└── types/                    # API 类型定义
```

### 环境变量

在 `koubo-frontend/` 根目录创建 `.env`：

```
TARO_APP_API_BASE=http://localhost:8080
```

生产环境创建 `.env.production`：

```
TARO_APP_API_BASE=https://api.yourdomain.com
```

### 微信小程序配置

`project.config.json` 中的 `appid` 替换为真实的小程序 AppID。

在微信公众平台后台配置合法域名：
- request 合法域名：`https://api.yourdomain.com`
- socket 合法域名：`wss://api.yourdomain.com`

---

## 开发规范

- 组件目录使用 kebab-case（如 `hud-card/`、`glow-button/`）
- 样式使用 SCSS + CSS 变量，不硬编码颜色值，统一从 `tokens.scss` 引入
- API 调用通过 `src/api/` 封装，不在页面中直接调用 `Taro.request`
- 提交前运行 `npm run type-check` 确保无 TS 报错
