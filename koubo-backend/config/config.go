package config

import "os"

type Config struct {
	DatabaseURL  string
	RedisURL     string
	OSSBucket    string
	OSSRegion    string
	OSSKeyID     string
	OSSKeySecret string
	LLMAPIKey    string
	LLMBaseURL   string
	ASRAppID     string
	ASRToken     string
	Port         string
}

func Load() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	return Config{
		DatabaseURL:  mustEnv("DATABASE_URL"),
		RedisURL:     mustEnv("REDIS_URL"),
		OSSBucket:    os.Getenv("OSS_BUCKET"),
		OSSRegion:    os.Getenv("OSS_REGION"),
		OSSKeyID:     os.Getenv("OSS_KEY_ID"),
		OSSKeySecret: os.Getenv("OSS_KEY_SECRET"),
		LLMAPIKey:    mustEnv("LLM_API_KEY"),
		LLMBaseURL:   mustEnv("LLM_BASE_URL"),
		ASRAppID:     os.Getenv("ASR_APP_ID"),
		ASRToken:     os.Getenv("ASR_TOKEN"),
		Port:         port,
	}
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic("missing required env: " + key)
	}
	return v
}
