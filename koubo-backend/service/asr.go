package service

import (
	"strings"
	"unicode/utf8"
)

// SlidingWindowMatcher matches recognized speech against script text
// to determine the current reading position.
type SlidingWindowMatcher struct {
	paragraphs []string // script split by paragraphs
	fullText   string   // concatenated full text for window search
}

// NewSlidingWindowMatcher creates a matcher from script content.
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

// Match searches for recognized text near currentPos (rune index) in the full script.
// Returns (paragraphIndex, wordIndex, newPos).
// wordIndex is the rune offset within the paragraph.
// If not found, returns the old position unchanged.
func (m *SlidingWindowMatcher) Match(recognized string, currentPos int) (paragraphIndex, wordIndex, newPos int) {
	recognized = strings.TrimSpace(recognized)
	if recognized == "" || len(m.paragraphs) == 0 {
		return 0, 0, currentPos
	}

	runes := []rune(m.fullText)
	total := len(runes)

	// Search window: 50 chars behind current pos, 200 chars ahead
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
	if idx < 0 {
		// Not found in window; try full text from currentPos forward
		if currentPos < total {
			forward := string(runes[currentPos:])
			fIdx := strings.Index(forward, recognized)
			if fIdx >= 0 {
				absPos := currentPos + utf8.RuneCountInString(string([]byte(forward)[:fIdx]))
				return m.posToParaWord(absPos)
			}
		}
		return 0, 0, currentPos
	}

	// idx is a byte offset within window; convert to rune offset
	windowBytes := []byte(window)
	runesBefore := utf8.RuneCount(windowBytes[:idx])
	absRunePos := windowStart + runesBefore

	pi, wi, np := m.posToParaWord(absRunePos)
	return pi, wi, np
}

// posToParaWord converts an absolute rune position in fullText
// to (paragraphIndex, wordIndex within paragraph, new absolute position).
func (m *SlidingWindowMatcher) posToParaWord(absPos int) (paragraphIndex, wordIndex, newPos int) {
	offset := 0
	for i, p := range m.paragraphs {
		pLen := utf8.RuneCountInString(p)
		if absPos <= offset+pLen {
			return i, absPos - offset, absPos
		}
		offset += pLen + 1 // +1 for \n separator
	}
	// Past end of text
	last := len(m.paragraphs) - 1
	if last < 0 {
		return 0, 0, absPos
	}
	return last, utf8.RuneCountInString(m.paragraphs[last]), absPos
}

// Paragraphs returns the parsed paragraphs.
func (m *SlidingWindowMatcher) Paragraphs() []string {
	return m.paragraphs
}
