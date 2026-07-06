package service

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

// ---- Volcengine ASR Client ----

const volcASRURL = "https://openspeech.bytedance.com/api/v1/asr"

// ASRClient calls Volcengine's short-audio recognition HTTP API.
type ASRClient struct {
	AppID     string
	Token     string
	Cluster   string
	Enabled   bool
	client    *http.Client
}

func NewASRClient(appID, token string) *ASRClient {
	enabled := appID != "" && appID != "placeholder" && token != "" && token != "placeholder"
	return &ASRClient{
		AppID:   appID,
		Token:   token,
		Cluster: "volcengine_input_common",
		Enabled: enabled,
		client:  &http.Client{Timeout: 10 * time.Second},
	}
}

// Recognize sends PCM 16kHz 16bit mono audio and returns recognized text.
func (c *ASRClient) Recognize(pcmData []byte) (string, error) {
	if !c.Enabled || len(pcmData) < 1600 { // need at least 50ms of audio
		return "", nil
	}

	url := fmt.Sprintf("%s?appid=%s&cluster=%s", volcASRURL, c.AppID, c.Cluster)
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(pcmData))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer;"+c.Token)
	req.Header.Set("Content-Type", "audio/pcm;rate=16000")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("asr request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("asr http %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Result []struct {
			Text string `json:"text"`
		} `json:"result"`
		Resp struct {
			Result []struct {
				Text string `json:"text"`
			} `json:"result"`
		} `json:"resp"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("asr parse: %w, body=%s", err, string(body))
	}

	// Try both response formats
	texts := result.Result
	if len(texts) == 0 {
		texts = result.Resp.Result
	}
	if len(texts) > 0 {
		return texts[0].Text, nil
	}
	return "", nil
}

// ---- PCM Buffer ----

// PCMBuffer accumulates PCM audio chunks for periodic ASR.
type PCMBuffer struct {
	mu       sync.Mutex
	buf      []byte
	sampleHz int
}

func NewPCMBuffer() *PCMBuffer {
	return &PCMBuffer{sampleHz: 16000}
}

// Append adds a PCM chunk to the buffer.
func (b *PCMBuffer) Append(chunk []byte) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.buf = append(b.buf, chunk...)
}

// Flush returns all accumulated data and resets the buffer.
func (b *PCMBuffer) Flush() []byte {
	b.mu.Lock()
	defer b.mu.Unlock()
	data := b.buf
	b.buf = nil
	return data
}

// Len returns current buffer size in bytes.
func (b *PCMBuffer) Len() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return len(b.buf)
}

// DurationMs estimates the audio duration in the buffer in milliseconds.
func (b *PCMBuffer) DurationMs() int {
	// 16-bit mono = 2 bytes per sample; sampleRate samples per second
	return (b.Len() / 2) * 1000 / b.sampleHz
}

// ---- PCM to WAV helper (for Volcengine ASR) ----

// AddWAVHeader prepends a minimal WAV header to raw PCM data.
// Volcengine accepts raw PCM in the HTTP body, so this may not be needed
// but is included for compatibility with other ASR services.
func AddWAVHeader(pcm []byte) []byte {
	sampleRate := 16000
	bitsPerSample := 16
	numChannels := 1
	byteRate := sampleRate * numChannels * bitsPerSample / 8
	blockAlign := numChannels * bitsPerSample / 8
	dataSize := len(pcm)

	header := make([]byte, 44)
	copy(header[0:4], "RIFF")
	binary.LittleEndian.PutUint32(header[4:], uint32(36+dataSize))
	copy(header[8:16], []byte("WAVEfmt "))
	binary.LittleEndian.PutUint32(header[16:], 16)        // chunk size
	binary.LittleEndian.PutUint16(header[20:], 1)         // PCM
	binary.LittleEndian.PutUint16(header[22:], uint16(numChannels))
	binary.LittleEndian.PutUint32(header[24:], uint32(sampleRate))
	binary.LittleEndian.PutUint32(header[28:], uint32(byteRate))
	binary.LittleEndian.PutUint16(header[32:], uint16(blockAlign))
	binary.LittleEndian.PutUint16(header[34:], uint16(bitsPerSample))
	copy(header[36:40], "data")
	binary.LittleEndian.PutUint32(header[40:], uint32(dataSize))

	return append(header, pcm...)
}

// ---- Sliding Window Matcher (unchanged from original) ----

type SlidingWindowMatcher struct {
	paragraphs []string
	fullText   string
}

func NewSlidingWindowMatcher(scriptContent string) *SlidingWindowMatcher {
	var paragraphs []string
	for _, p := range strings.Split(scriptContent, "\n") {
		if t := strings.TrimSpace(p); t != "" {
			paragraphs = append(paragraphs, t)
		}
	}
	return &SlidingWindowMatcher{
		paragraphs: paragraphs,
		fullText:   strings.Join(paragraphs, "\n"),
	}
}

func (m *SlidingWindowMatcher) Match(recognized string, currentPos int) (paragraphIndex, wordIndex, newPos int) {
	recognized = strings.TrimSpace(recognized)
	if recognized == "" || len(m.paragraphs) == 0 {
		return 0, 0, currentPos
	}

	runes := []rune(m.fullText)
	total := len(runes)
	if total == 0 {
		return 0, 0, currentPos
	}

	windowStart := currentPos - 50
	if windowStart < 0 {
		windowStart = 0
	}
	windowEnd := currentPos + 200
	if windowEnd > total {
		windowEnd = total
	}

	window := string(runes[windowStart:windowEnd])
	idx := strings.Index(window, recognized)
	if idx < 0 && currentPos < total {
		forward := string(runes[currentPos:])
		fIdx := strings.Index(forward, recognized)
		if fIdx >= 0 {
			absPos := currentPos + utf8.RuneCountInString(string([]byte(forward)[:fIdx]))
			return m.posToParaWord(absPos)
		}
	}
	if idx < 0 {
		return 0, 0, currentPos
	}

	windowBytes := []byte(window)
	runesBefore := utf8.RuneCount(windowBytes[:idx])
	absRunePos := windowStart + runesBefore

	pi, wi, np := m.posToParaWord(absRunePos)
	return pi, wi, np
}

func (m *SlidingWindowMatcher) posToParaWord(absPos int) (paragraphIndex, wordIndex, newPos int) {
	offset := 0
	for i, p := range m.paragraphs {
		pLen := utf8.RuneCountInString(p)
		if absPos <= offset+pLen {
			return i, absPos - offset, absPos
		}
		offset += pLen + 1
	}
	last := len(m.paragraphs) - 1
	if last < 0 {
		return 0, 0, absPos
	}
	return last, utf8.RuneCountInString(m.paragraphs[last]), absPos
}

func (m *SlidingWindowMatcher) Paragraphs() []string {
	return m.paragraphs
}
