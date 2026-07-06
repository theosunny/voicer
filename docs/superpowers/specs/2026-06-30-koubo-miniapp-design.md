# 口播一站式小程序 · 产品设计文档

**日期**: 2026-06-30  
**最后更新**: 2026-07-07  
**状态**: ✅ MVP 核心功能已实现

---

## 1. 产品定位

面向**个人内容创作者**的口播全流程工具，支持微信小程序 + 抖音小程序双端。

核心价值：降低口播内容创作门槛——从文案生成、录制提词、到视频剪辑，一站式完成。

---

## 2. 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 端（前端） | Taro 4.2 (React 18) | 一套代码出微信 + 抖音小程序 |
| API 服务 | Go 1.26 + Hertz | 高性能 HTTP + WebSocket |
| 异步任务队列 | Asynq + Redis | Go 生态成熟的任务队列 |
| 视频处理 | FFmpeg（os/exec 调用） | 剪辑、字幕叠入 |
| AI 文案生成 | **DeepSeek** (`deepseek-chat`) | OpenAI 兼容格式，SSE 流式返回 |
| 实时 ASR | **火山引擎** 流式 ASR | HTTP API / WebSocket → 滑动窗口文案匹配 |
| 对象存储 | 阿里云 OSS / 本地存储 | 视频、音频文件 |
| 数据库 | PostgreSQL 16 + GORM | 用户、文案、视频数据 |

---

## 3. 整体架构

```
┌─────────────────────────────────────────┐
│       端：Taro (React)                  │
│  微信小程序                              │
│  [模板浏览] [文案生成] [提词器+录制]     │
│  [我的作品] [视频处理]                   │
└──────────────┬──────────────────────────┘
               │ HTTPS / WSS (CORS)
┌──────────────▼──────────────────────────┐
│     API 网关：Go + Hertz                │
│  POST /api/script/generate (SSE)       │
│  POST /api/script/draft                │
│  GET  /api/script/:id                   │
│  WS   /api/asr/stream (ASR)            │
│  POST /api/video/submit                 │
│  GET  /api/video/:id/status            │
│  GET  /api/templates/trending           │
└──────┬──────────────┬───────────────────┘
       │              │
┌──────▼──────┐  ┌────▼──────────────────┐
│  DeepSeek   │  │  Redis + Asynq        │
│  (文案生成) │  │  (视频剪辑任务队列)   │
└─────────────┘  └────┬──────────────────┘
                      │
               ┌──────▼──────────┐
               │  FFmpeg Worker  │
               │  (去静默+字幕)  │
               └──────┬──────────┘
                      │
               ┌──────▼──────────┐
               │  本地 /uploads  │
               │  视频 / 音频    │
               └─────────────────┘
```

---

## 4. MVP 完成情况

### ✅ 已完成

| 模块 | 功能 | 状态 |
|------|------|------|
| **模板浏览** | 首页 Feed、领域筛选、精选标记、无限滚动 | ✅ |
| **AI 文案生成** | 领域推荐 / 自由输入、风格选择、DeepSeek SSE 流式生成 | ✅ |
| **文案编辑** | 加载已有文案、内容编辑、字数统计、保存草稿 | ✅ |
| **提词器 + 录制** | 文案自动滚动（ASR + 时间双驱动）、前置摄像头自拍、PCM 录音采集 | ✅ |
| **试听 + 保存** | 录制完成弹窗 → 试听播放 → 提交后端 | ✅ |
| **视频处理状态** | 轮询状态、完成展示、试听/保存 | ✅ |
| **后端 API 完整链路** | 文案生成、草稿保存、模板列表、视频提交、状态查询、ASR WebSocket | ✅ |
| **CORS 中间件** | 全路由跨域支持 | ✅ |
| **DeepSeek LLM** | 替换火山方舟为 DeepSeek，兼容 OpenAI 格式 | ✅ |
| **主题** | 奶油白磨玻璃设计（暗黑 → 苹果风格） | ✅ |
| **图标** | 81×81 Pillow 生成 PNG，系统自动着色 | ✅ |
| **部署** | `scripts/deploy.sh` (dev/docker/prod) + `Dockerfile` + `docker-compose.yml` + `docs/deploy.md` | ✅ |

### ⚠ 待接入

| 模块 | 说明 | 优先级 |
|------|------|--------|
| **ASR 真实识别** | WebSocket 通路已建、PCM 采集已就绪、滑动窗口匹配已实现。接入火山引擎 APP ID + Token 即可启用 | 🟡 中 |
| **OSS 视频存储** | 当前 `.env` 中 OSS 为占位符，文件本地存入 `uploads/` 目录。生产环境需接入阿里云 OSS | 🟡 中 |
| **FFmpeg 视频剪辑** | Worker 代码已编写（去静默 + SRT 字幕 + 硬编码），需要真实视频文件联调测试 | 🟡 中 |
| **通知推送** | 视频处理完成后无通知，当前靠轮询 | 🟢 低 |

### 🔲 二期规划

| 模块 | 说明 |
|------|------|
| **抖音小程序适配** | Taro 框架已支持，TT 平台编译 + 调试 |
| **广告商口播市场** | 广告主发任务 → 创作者认领 → 录制提交 → 审核 → 分成结算 |
| **数据统计看板** | 创作历史、播放量、使用次数统计 |
| **视频水印/品牌定制** | 广告主 Logo、专属字幕样式 |
| **多语言生成** | 英文、日文口播文案 |

---

## 5. 数据模型（已实施）

```
User
  id, openid, platform(wechat/douyin), nickname, avatar, created_at

Script
  id, user_id, title, content(text), script_type(promo/insight/life),
  style(casual/professional/emotional), duration_estimate(s),
  status(draft/confirmed), created_at, updated_at

Video
  id, user_id, script_id, raw_video_url, processed_video_url,
  frame_markers(jsonb), asr_result(text), status(processing/completed/failed),
  error_msg, created_at, completed_at

Template
  id, title, domain, content_structure(text), usage_count, is_featured, created_at
```

### 实际偏离设计处

| 类别 | 原设计 | 实际 |
|------|--------|------|
| LLM | 火山方舟（豆包） | **DeepSeek** (`deepseek-chat`)，兼容 OpenAI 格式 |
| DB 驱动 | pgx 连接池 | **GORM** + postgres driver |
| Go 版本 | 1.22 | **1.26** |
| 前端主题 | 暗黑 HUD 霓虹 | **奶油白磨玻璃** |
| WSL2 网络 | 手动端口映射 | `networkingMode=mirrored` |
| OSS | 阿里云 OSS | 本地 `uploads/` 目录（OSS 代码保留，替换 Key 即切换） |

### API 响应格式统一

所有接口返回 `{success: true, data: ...}` 格式，兼容前端 `ApiResponse<T>` 类型：

| 接口 | 请求 | 响应 |
|------|------|------|
| `POST /api/script/generate` | `{topic, style, duration, ...}` | SSE 流 `{type:"chunk", content:"..."}` → `{type:"done", script_id:"..."}` |
| `POST /api/script/draft` | `{title, content, script_type, style}` | `{success, data: {id, ...}}` |
| `GET /api/script/:id` | — | `{success, data: {...}}` |
| `GET /api/templates/trending` | `?domain=&limit=10&page=1` | `{success, data: [...], total, page, limit}` |
| `POST /api/video/submit` | multipart `video + script_id + frame_markers` | `{success, data: {video_id}}` |
| `GET /api/video/:id/status` | — | `{success, data: {status, processed_video_url, ...}}` |

### 中英文字段映射

前端 UI 使用中文标签（如"产品推广"），后端自动映射为 DB 英文枚举（`promo`）：

| 前端 | 后端 DB |
|------|---------|
| 产品推广 | `promo` |
| 个人感悟 / 知识科普 / 情感故事 | `insight` |
| 生活分享 | `life` |
| 轻松随性 / 幽默风趣 | `casual` |
| 专业权威 | `professional` |
| 情感共鸣 | `emotional` |
| 30s / 60s / 3min | 30 / 60 / 180 秒 |

---

## 6. ASR 语音追踪

```
前端 PCM 音频帧 → WebSocket /api/asr/stream
                  → 后端缓冲 2s → 火山引擎 HTTP ASR
                  → 识别文本 → 滑动窗口匹配文案位置
                  → 推回 {paragraph_index, word_index}
前端收到位置 → 设置 currentPara → 文案自动滚动 + 高亮
```

当前 ASR 未接入真实服务时，自动退化到时间估算滚动（中文 ~4字/秒）。

---

## 7. 录制页布局

```
┌─────────────────────────────────┐
│   📷 前置摄像头 (36vh)           │
│     ●REC  01:23                │
├─────────────────────────────────┤
│  已读段落 (淡灰)                 │
│  ██ 当前 · 大字高亮 ██          │
│  🎤 AI 追踪中                  │
│  下一段 ...                     │
├─────────────────────────────────┤
│  ⏸ 暂停    ●    ↩ 重录         │
└─────────────────────────────────┘
```

---

## 8. 文件结构（实际）

```
voicer/
├── scripts/
│   └── deploy.sh                 # 一键部署 (dev/docker/prod)
├── docs/
│   ├── deploy.md                 # 部署指南
│   ├── superpowers/
│   │   ├── specs/
│   │   │   └── 2026-06-30-koubo-miniapp-design.md  # 本文档
│   │   └── plans/
│   │       └── 2026-06-30-koubo-backend-plan.md    # 后端实现计划
│   └── ui-specs/
│       └── frontend-ui-spec.md                     # UI 规格
├── koubo-backend/
│   ├── main.go
│   ├── Dockerfile / docker-compose.yml / .env.example
│   ├── config/config.go
│   ├── db/db.go + migrations/001_init.sql
│   ├── handler/{script, asr, video, template}.go
│   ├── model/{user, script, video, template}.go
│   ├── repo/{user, script, video, template}.go
│   ├── service/{script, asr, video}.go
│   ├── worker/{worker, ffmpeg}.go
│   └── storage/oss.go
└── koubo-frontend/
    ├── config/{index, dev, prod}.ts
    ├── src/
    │   ├── pages/{index, create, videos, profile, script/generate, script/edit, record, video/status}
    │   ├── components/{chip, glow-button, hud-card, step-progress, toast}
    │   ├── api/{client, script, template, video}.ts
    │   ├── hooks/{useSSE, useASRSocket, useVideoPoller}.ts
    │   └── styles/{tokens, global, typography, mixins}.scss
    └── project.config.json
```
