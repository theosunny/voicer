package main

import (
	"context"
	"koubo-backend/config"
	"koubo-backend/db"
	"koubo-backend/handler"
	"koubo-backend/model"
	"koubo-backend/repo"
	"koubo-backend/service"
	"koubo-backend/worker"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hibiken/asynq"
)

func main() {
	cfg := config.Load()

	gormDB, err := db.Init(cfg.DatabaseURL)
	if err != nil {
		panic("failed to connect to database: " + err.Error())
	}

	scriptRepo := repo.NewScriptRepo(gormDB)
	videoRepo := repo.NewVideoRepo(gormDB)
	templateRepo := repo.NewTemplateRepo(gormDB)
	userRepo := repo.NewUserRepo(gormDB)

	// Auto-migrate tables (adds new columns if missing)
	_ = gormDB.AutoMigrate(&model.User{}, &model.Template{})

	// Upsert network-style templates (update title/description/structure if title matches)
	networkTemplates := []model.Template{
		{
			Title:            "30秒痛点反击流",
			Description:      "先用扎心痛点抓人，再用产品啪啪打脸，适合快节奏带货",
			Domain:           "产品",
			ContentStructure: "痛点抓人（扎心一问，戳中目标用户）➔ 观点反击（打破认知，推翻常见误区）➔ 产品引出（自然植入，强调差异化卖点）➔ 行动号召（限时感+稀缺感收尾）",
			Duration:         "30s",
			ScriptType:       "promo",
			IsFeatured:       true,
		},
		{
			Title:            "60秒同行揭秘流",
			Description:      "揭秘行业不为人知的内幕，顺势引出解决方案，适合打造专业人设",
			Domain:           "知识",
			ContentStructure: "反直觉开场（抛出让人意外的行业内幕）➔ 知识拆解（3步讲清楚底层逻辑）➔ 方案引出（自然过渡到产品/服务）➔ 总结金句（一句话让人记住你）",
			Duration:         "60s",
			ScriptType:       "insight",
			IsFeatured:       true,
		},
		{
			Title:            "3分钟深夜走心流",
			Description:      "用真实细节戳中打工人/宝妈泪点，适合做高赞、高转发的深度内容",
			Domain:           "生活",
			ContentStructure: "场景代入（一个真实得让人头皮发麻的生活细节）➔ 情绪发酵（把那个感受放大，说出大家没说出口的话）➔ 转折升华（我是怎么走出来或改变的）➔ 结尾共鸣（一句邀请互动的话，引发评论区共鸣）",
			Duration:         "3min",
			ScriptType:       "life",
			IsFeatured:       true,
		},
		{
			Title:            "60秒美食探店打卡",
			Description:      "环境+菜品+推荐理由三连击，适合本地探店和美食博主",
			Domain:           "美食",
			ContentStructure: "位置打卡（地址+环境氛围一句话）➔ 主推菜点评（口感细节要具体，用比喻）➔ 隐藏彩蛋（一个别人不知道的小技巧或必点项）➔ 推荐理由（适合什么人，什么场合来）",
			Duration:         "60s",
			ScriptType:       "life",
			IsFeatured:       false,
		},
		{
			Title:            "30秒美妆种草流",
			Description:      "成分党最爱，用数据和对比说话，适合美妆产品快速种草",
			Domain:           "美妆",
			ContentStructure: "痛点一问（你是不是也有这个皮肤困扰）➔ 成分揭秘（说出关键成分，越专业越有说服力）➔ 上脸效果（用具体感受描述，避免广告感）➔ 收尾种草（价格锚点+购买引导）",
			Duration:         "30s",
			ScriptType:       "promo",
			IsFeatured:       false,
		},
	}
	for _, t := range networkTemplates {
		gormDB.Where(model.Template{Title: t.Title}).
			Assign(model.Template{
				Description:      t.Description,
				Domain:           t.Domain,
				ContentStructure: t.ContentStructure,
				Duration:         t.Duration,
				ScriptType:       t.ScriptType,
				IsFeatured:       t.IsFeatured,
			}).
			FirstOrCreate(&model.Template{})
	}

	asynqClient := worker.NewClient(cfg.RedisURL)
	defer asynqClient.Close()

	scriptSvc := service.NewScriptService(cfg.LLMAPIKey, cfg.LLMBaseURL)
	videoSvc := service.NewVideoService(asynqClient)

	var agentSvc *service.AgentService
	if cfg.AgentBaseURL != "" {
		agentSvc = service.NewAgentService(cfg.AgentBaseURL)
		bgCtx := context.Background()
		_ = agentSvc.EnsureRole(bgCtx, "koubo-creator", "口播文案创作者",
			"专注于口播脚本创作，熟悉小红书、抖音等平台的口播风格，能根据用户人设和历史偏好生成个性化文案。")
		_ = agentSvc.EnsurePersona(bgCtx, "koubo-creator", "default", "默认创作者",
			"通用口播创作者，无特定风格偏好，根据每次任务要求灵活创作。")
	}

	asrClient := service.NewASRClient(cfg.ASRAppID, cfg.ASRToken)

	scriptHandler := handler.NewScriptHandler(scriptSvc, agentSvc, scriptRepo, templateRepo)
	asrHandler := handler.NewASRHandler(asrClient)
	videoHandler := handler.NewVideoHandler(videoRepo, videoSvc, "uploads")
	templateHandler := handler.NewTemplateHandler(templateRepo)
	authHandler := handler.NewAuthHandler(userRepo, cfg.WXAppID, cfg.WXAppSecret)

	ffmpegWorker := worker.NewFFmpegWorker(videoRepo, nil)
	mux := asynq.NewServeMux()
	mux.HandleFunc(worker.TypeVideoProcess, ffmpegWorker.HandleVideoProcess)
	go worker.StartServer(cfg.RedisURL, mux)

	h := server.Default(server.WithHostPorts(":" + cfg.Port))

	// CORS middleware
	h.Use(func(ctx context.Context, c *app.RequestContext) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if string(c.Method()) == "OPTIONS" {
			c.Status(204)
			return
		}
		c.Next(ctx)
	})

	h.GET("/health", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{"status": "ok"})
	})

	// Serve uploaded files — manual handler (StaticFS path resolution is unreliable)
	h.GET("/uploads/*filepath", func(ctx context.Context, c *app.RequestContext) {
		fp := c.Param("filepath")
		filePath := "./uploads/" + fp
		c.File(filePath)
	})

	api := h.Group("/api")
	api.POST("/auth/wx-login", authHandler.WxLogin)
	api.GET("/auth/profile", authHandler.GetProfile)
	api.PUT("/auth/profile", authHandler.UpdateProfile)
	api.GET("/scripts", scriptHandler.ListScripts)
	api.POST("/script/generate", scriptHandler.Generate)
	api.POST("/script/draft", scriptHandler.SaveDraft)
	api.GET("/script/:id", scriptHandler.GetByID)
	api.GET("/asr/stream", asrHandler.Stream)
	api.POST("/video/submit", videoHandler.Submit)
	api.GET("/video/:id/status", videoHandler.Status)
	api.DELETE("/video/:id", videoHandler.Delete)
	api.GET("/videos", videoHandler.List)
	api.GET("/templates/trending", templateHandler.List)

	h.Spin()
}
