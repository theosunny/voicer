package handler

import (
	"context"
	"encoding/json"
	"koubo-backend/repo"
	"koubo-backend/service"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/hertz-contrib/websocket"
)

var upgrader = websocket.HertzUpgrader{
	CheckOrigin: func(ctx *app.RequestContext) bool { return true },
}

type ASRHandler struct {
	scriptRepo *repo.ScriptRepo
}

func NewASRHandler(scriptRepo *repo.ScriptRepo) *ASRHandler {
	return &ASRHandler{scriptRepo: scriptRepo}
}

type asrInitMsg struct {
	ScriptID string `json:"script_id"`
}

type asrScrollMsg struct {
	ParagraphIndex int    `json:"paragraph_index"`
	WordIndex      int    `json:"word_index"`
	Recognized     string `json:"recognized"`
}

// Stream handles WS /api/asr/stream
// Protocol:
//  1. Client sends first text message: {"script_id":"uuid"}
//  2. Client sends binary audio chunks (PCM 16kHz mono)
//  3. Server sends back scroll messages: {"paragraph_index":N,"word_index":M,"recognized":"..."}
//
// In this implementation the ASR is simulated: we echo recognized text
// from script content for demo purposes. Real implementation would
// forward audio to Volcengine/iFlytek ASR WebSocket.
func (h *ASRHandler) Stream(ctx context.Context, c *app.RequestContext) {
	if err := upgrader.Upgrade(c, func(conn *websocket.Conn) {
		defer conn.Close()

		var matcher *service.SlidingWindowMatcher
		currentPos := 0

		for {
			msgType, data, err := conn.ReadMessage()
			if err != nil {
				return
			}

			// First text message: init with script content
			if matcher == nil && msgType == websocket.TextMessage {
				var init asrInitMsg
				if err := json.Unmarshal(data, &init); err != nil {
					return
				}
				scriptContent := ""
				if h.scriptRepo != nil && init.ScriptID != "" {
					if script, err := h.scriptRepo.GetByID(ctx, init.ScriptID); err == nil {
						scriptContent = script.Content
					}
				}
				matcher = service.NewSlidingWindowMatcher(scriptContent)
				continue
			}

			// Binary messages: audio chunks (PCM)
			// In production: forward to ASR WebSocket, receive recognized text
			// Here: skip (ASR integration handled outside this stub)
			if msgType == websocket.BinaryMessage {
				// TODO(production): forward data to ASR service WebSocket,
				// receive recognized string, then call matcher.Match()
				_ = data
				continue
			}

			// Text message after init: treat as recognized text (for testing)
			if msgType == websocket.TextMessage && matcher != nil {
				recognized := string(data)
				pi, wi, newPos := matcher.Match(recognized, currentPos)
				currentPos = newPos

				resp, _ := json.Marshal(asrScrollMsg{
					ParagraphIndex: pi,
					WordIndex:      wi,
					Recognized:     recognized,
				})
				if err := conn.WriteMessage(websocket.TextMessage, resp); err != nil {
					return
				}
			}
		}
	}); err != nil {
		c.JSON(400, map[string]string{"error": "websocket upgrade failed"})
	}
}
