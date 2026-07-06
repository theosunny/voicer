package handler

import (
	"context"
	"encoding/json"
	"koubo-backend/service"
	"log"
	"sync"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/hertz-contrib/websocket"
)

var upgrader = websocket.HertzUpgrader{
	CheckOrigin: func(ctx *app.RequestContext) bool { return true },
}

type ASRHandler struct {
	asrClient *service.ASRClient
}

func NewASRHandler(asrClient *service.ASRClient) *ASRHandler {
	return &ASRHandler{asrClient: asrClient}
}

type asrInitMsg struct {
	ScriptID  string `json:"script_id"`
	Content   string `json:"content"` // script full text sent from frontend
}

type asrScrollMsg struct {
	Type           string `json:"type"`
	ParagraphIndex int    `json:"paragraph_index"`
	WordIndex      int    `json:"word_index"`
	Recognized     string `json:"recognized"`
}

// Stream handles WS /api/asr/stream
//
// Protocol:
//  1. Client sends init text message: {"script_id":"uuid","content":"full script text..."}
//  2. Client sends binary PCM audio chunks (16kHz, 16bit, mono)
//  3. Server buffers audio, calls Volcengine ASR every ~2s, matches position
//  4. Server sends position updates: {"type":"position","paragraph_index":N,"word_index":M,"recognized":"..."}
//  5. When ASR is disabled, server falls back to echo/skip
func (h *ASRHandler) Stream(ctx context.Context, c *app.RequestContext) {
	if err := upgrader.Upgrade(c, func(conn *websocket.Conn) {
		defer conn.Close()

		var matcher *service.SlidingWindowMatcher
		currentPos := 0
		buffer := service.NewPCMBuffer()

		// Background ASR ticker — flush buffer every 2 seconds
		ctx, cancel := context.WithCancel(ctx)
		defer cancel()

		var mu sync.Mutex
		var lastText string

		// ASR polling goroutine
		go func() {
			ticker := time.NewTicker(2 * time.Second)
			defer ticker.Stop()
			for {
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					if !h.asrClient.Enabled {
						continue
					}
					pcm := buffer.Flush()
					if len(pcm) < 3200 { // need at least 100ms
						continue
					}
					text, err := h.asrClient.Recognize(pcm)
					if err != nil {
						log.Printf("ASR recognize error: %v", err)
						continue
					}
					if text == "" || text == lastText {
						continue
					}
					lastText = text

					mu.Lock()
					m := matcher
					cp := currentPos
					mu.Unlock()

					if m == nil {
						continue
					}

					pi, wi, newPos := m.Match(text, cp)
					mu.Lock()
					currentPos = newPos
					mu.Unlock()

					resp, _ := json.Marshal(asrScrollMsg{
						Type:           "position",
						ParagraphIndex: pi,
						WordIndex:      wi,
						Recognized:     text,
					})
					if err := conn.WriteMessage(websocket.TextMessage, resp); err != nil {
						return
					}
				}
			}
		}()

		for {
			msgType, data, err := conn.ReadMessage()
			if err != nil {
				return
			}

			switch msgType {
			case websocket.TextMessage:
				// Init message — first text frame
				if matcher == nil {
					var init asrInitMsg
					if err := json.Unmarshal(data, &init); err != nil {
						log.Printf("ASR: invalid init: %v", err)
						continue
					}
					content := init.Content
					matcher = service.NewSlidingWindowMatcher(content)
					mu.Lock()
					currentPos = 0
					mu.Unlock()
					log.Printf("ASR: initialized with %d chars of script", len(content))
				}

			case websocket.BinaryMessage:
				// PCM audio chunk — buffer for ASR
				buffer.Append(data)
				// Also echo back first few chars for instant visual feedback
				// when ASR is disabled (time-based scrolling handles it in frontend)
				_ = data
			}
		}
	}); err != nil {
		c.JSON(400, map[string]string{"error": "websocket upgrade failed"})
	}
}
