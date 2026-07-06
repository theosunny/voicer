package main

import (
	"context"
	"koubo-backend/config"
	"koubo-backend/db"
	"koubo-backend/handler"
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

	asynqClient := worker.NewClient(cfg.RedisURL)
	defer asynqClient.Close()

	scriptSvc := service.NewScriptService(cfg.LLMAPIKey, cfg.LLMBaseURL)
	videoSvc := service.NewVideoService(asynqClient)

	asrClient := service.NewASRClient(cfg.ASRAppID, cfg.ASRToken)

	scriptHandler := handler.NewScriptHandler(scriptSvc, scriptRepo)
	asrHandler := handler.NewASRHandler(asrClient)
	videoHandler := handler.NewVideoHandler(videoRepo, videoSvc, "uploads")
	templateHandler := handler.NewTemplateHandler(templateRepo)

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

	// Serve uploaded audio files
	h.StaticFS("/uploads", &app.FS{Root: "./uploads/"})

	api := h.Group("/api")
	api.POST("/script/generate", scriptHandler.Generate)
	api.POST("/script/draft", scriptHandler.SaveDraft)
	api.GET("/script/:id", scriptHandler.GetByID)
	api.GET("/asr/stream", asrHandler.Stream)
	api.POST("/video/submit", videoHandler.Submit)
	api.GET("/video/:id/status", videoHandler.Status)
	api.GET("/templates/trending", templateHandler.List)

	h.Spin()
}
