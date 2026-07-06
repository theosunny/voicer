# 口播小程序 · 后端实现计划

> **Status**: ✅ MVP 已完成 (2026-07-07)  
> **Next**: ASR 真实对接 → OSS 生产接入 → 抖音小程序 → 广告市场（二期）

---

## 实施记录

| 任务 | 状态 | 实际 vs 计划 |
|------|------|-------------|
| Task 1: Go 模块 + Hertz 骨架 | ✅ | Go 1.26, GORM 替代 pgx, 添加 CORS 中间件 |
| Task 2: 数据库初始化 | ✅ | PostgreSQL 16, 5 条种子模板, 测试用户 |
| Task 3: 文案生成 API (SSE) | ✅ | DeepSeek (`deepseek-chat`) 替代豆包; 中英文映射; `Duration` 字符串→秒转换 |
| Task 4: 模板 API | ✅ | 返回格式 `{success, data, total, page, limit}` |
| Task 5: 视频提交 + 状态轮询 | ✅ | 本地文件存储 `uploads/`, 暂存 mp3 |
| Task 6: ASR WebSocket | ⚠ 通路已通 | WebSocket + PCM 缓冲 + 火山引擎 ASR Client 已实现，等待真实 APP ID |
| Task 7: FFmpeg Worker | ⚠ 骨架 | 去静默 + SRT 字幕代码已写，需真实文件联调 |
| Task 8: 部署脚本 + 文档 | ✅ | `scripts/deploy.sh` (dev/docker/prod) + `Dockerfile` + `docker-compose.yml` + `docs/deploy.md` |
| Task 9: 保存草稿 API | ✅ | `POST /api/script/draft` + `GET /api/script/:id` |
| Task 10: 文案编辑页 | ✅ | 加载已有文案、编辑、保存、跳转录制 |

---

## API 路由清单

```
GET  /health                        → {"status":"ok"}
GET  /uploads/*filepath             → 静态文件 (视频/音频)

POST /api/script/generate           → SSE 流式 (DeepSeek)
POST /api/script/draft              → 保存草稿
GET  /api/script/:id                → 获取文案
WS   /api/asr/stream                → ASR 语音追踪
POST /api/video/submit              → 提交视频/音频 (multipart)
GET  /api/video/:id/status          → 查询处理状态
GET  /api/templates/trending        → 模板列表
```

---

## 环境变量

```bash
# 必填
DATABASE_URL=postgres://postgres:postgres@localhost:5432/koubo?sslmode=disable
REDIS_URL=localhost:6379
LLM_API_KEY=sk-...            # DeepSeek API Key
LLM_BASE_URL=https://api.deepseek.com

# 选填 (ASR / OSS 暂用占位符)
ASR_APP_ID=placeholder
ASR_TOKEN=placeholder
OSS_BUCKET=placeholder
OSS_REGION=cn-hangzhou
OSS_KEY_ID=placeholder
OSS_KEY_SECRET=placeholder
PORT=8080
```

---

## 待办 (TODO)

### 短期 (Phase 1 收尾)
- [ ] **ASR 真实接入**：申请火山引擎 APP ID + Token → 填入 `.env` → 测试语音识别精度
- [ ] **OSS 接入**：申请阿里云 OSS Bucket → 填入 `.env` → `uploadFile` 直接上传到 OSS
- [ ] **FFmpeg 联调**：真实视频文件 → 测试去静默 + SRT 字幕叠入
- [ ] **录制产物展示**：状态页播放处理后的视频
- [ ] **用户系统**：微信登录获取 openid，替代测试用户

### 中期 (Phase 2)
- [ ] **抖音小程序**：编译 `npm run build:tt` → 抖音开发者工具调试
- [ ] **视频水印**：FFmpeg 叠入创作者 Logo
- [ ] **消息通知**：模板消息推送处理完成状态
- [ ] **性能优化**：API 限流、连接池调优、CDN 加速

### 长期 (Phase 3)
- [ ] **广告商口播市场**：广告任务发布、认领、提交审核、自动结算
- [ ] **数据统计**：创作者看板（播放量、完成率、收益）
- [ ] **多语言文案**：英文/日文口播生成
