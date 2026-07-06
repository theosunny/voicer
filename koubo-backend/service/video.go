package service

import (
	"context"
	"koubo-backend/worker"

	"github.com/hibiken/asynq"
)

type VideoService struct {
	client *asynq.Client
}

func NewVideoService(client *asynq.Client) *VideoService {
	return &VideoService{client: client}
}

func (s *VideoService) EnqueueProcess(ctx context.Context, videoID string) error {
	task, err := worker.NewVideoProcessTask(videoID)
	if err != nil {
		return err
	}
	_, err = s.client.EnqueueContext(ctx, task)
	return err
}
