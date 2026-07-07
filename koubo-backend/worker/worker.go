package worker

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/hibiken/asynq"
)

const TypeVideoProcess = "video:process"

type VideoProcessPayload struct {
	VideoID string `json:"video_id"`
}

// NewClient returns an Asynq client for enqueueing tasks.
func NewClient(redisURL string) *asynq.Client {
	return asynq.NewClient(asynq.RedisClientOpt{Addr: redisURL})
}

// NewVideoProcessTask creates an Asynq task for video processing.
func NewVideoProcessTask(videoID string) (*asynq.Task, error) {
	payload, err := json.Marshal(VideoProcessPayload{VideoID: videoID})
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeVideoProcess, payload,
		asynq.MaxRetry(2),
		asynq.Timeout(10*time.Minute),
	), nil
}

// StartServer starts the Asynq worker server.
// Call this in a goroutine from main.
func StartServer(redisURL string, mux *asynq.ServeMux) {
	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: redisURL},
		asynq.Config{
			Concurrency: 5,
			ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
				log.Printf("task %s failed: %v", task.Type(), err)
			}),
		},
	)
	if err := srv.Run(mux); err != nil {
		log.Fatalf("asynq server error: %v", err)
	}
}
