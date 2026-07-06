CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openid      VARCHAR(128) NOT NULL,
  platform    VARCHAR(16)  NOT NULL CHECK (platform IN ('wechat','douyin')),
  nickname    VARCHAR(64),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_users_openid_platform ON users(openid, platform);

CREATE TABLE scripts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             VARCHAR(128) NOT NULL DEFAULT '',
  content           TEXT NOT NULL DEFAULT '',
  script_type       VARCHAR(16) NOT NULL CHECK (script_type IN ('promo','insight','life')),
  style             VARCHAR(32) NOT NULL DEFAULT 'normal',
  duration_estimate INT NOT NULL DEFAULT 0,
  status            VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE videos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  script_id           UUID REFERENCES scripts(id) ON DELETE SET NULL,
  raw_video_url       TEXT,
  processed_video_url TEXT,
  frame_markers       JSONB NOT NULL DEFAULT '[]',
  asr_result          TEXT NOT NULL DEFAULT '',
  status              VARCHAR(16) NOT NULL DEFAULT 'processing'
                        CHECK (status IN ('processing','completed','failed')),
  error_msg           TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

CREATE TABLE templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             VARCHAR(128) NOT NULL,
  domain            VARCHAR(64)  NOT NULL DEFAULT '',
  content_structure TEXT NOT NULL,
  usage_count       INT  NOT NULL DEFAULT 0,
  is_featured       BOOL NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO templates (title, domain, content_structure, is_featured) VALUES
  ('产品种草三段式', 'product', '开场钩子（提问痛点）+ 产品介绍（三大卖点）+ 行动号召（限时优惠）', true),
  ('情感共鸣分享', 'lifestyle', '引入场景（生活细节）+ 感悟展开（转折升华）+ 结尾共鸣（邀请互动）', true),
  ('干货知识科普', 'knowledge', '抛出问题（反直觉观点）+ 知识拆解（三步讲清楚）+ 总结金句', true),
  ('励志正能量', 'motivation', '困境描述（真实故事）+ 突破过程（具体行动）+ 激励收尾', false),
  ('美食探店打卡', 'food', '位置打卡（环境氛围）+ 菜品点评（口感细节）+ 推荐理由（适合人群）', false);
