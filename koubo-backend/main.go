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

	scriptHandler := handler.NewScriptHandler(scriptSvc, scriptRepo)
	asrHandler := handler.NewASRHandler(scriptRepo)
	videoHandler := handler.NewVideoHandler(videoRepo, videoSvc, nil)
	templateHandler := handler.NewTemplateHandler(templateRepo)

	ffmpegWorker := worker.NewFFmpegWorker(videoRepo, nil)
	mux := asynq.NewServeMux()
	mux.HandleFunc(worker.TypeVideoProcess, ffmpegWorker.HandleVideoProcess)
	go worker.StartServer(cfg.RedisURL, mux)

	h := server.Default(server.WithHostPorts(":" + cfg.Port))

	h.GET("/health", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{"status": "ok"})
	})

	api := h.Group("/api")
	api.POST("/script/generate", scriptHandler.Generate)
	api.GET("/asr/stream", asrHandler.Stream)
	api.POST("/video/submit", videoHandler.Submit)
	api.GET("/video/:id/status", videoHandler.Status)
	api.GET("/templates/trending", templateHandler.List)

	h.Spin()
}
