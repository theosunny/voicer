package service

import (
	"testing"
)

func TestSlidingWindowMatcher_Match(t *testing.T) {
	script := "今天天气真好\n我想出去走走\n感受一下阳光"
	m := NewSlidingWindowMatcher(script)

	// Match first paragraph
	pi, wi, newPos := m.Match("天气真好", 0)
	if pi != 0 {
		t.Errorf("expected paragraph 0, got %d", pi)
	}
	if newPos <= 0 {
		t.Errorf("expected newPos > 0, got %d", newPos)
	}
	_ = wi

	// Match second paragraph
	pi2, _, _ := m.Match("出去走走", newPos)
	if pi2 != 1 {
		t.Errorf("expected paragraph 1, got %d", pi2)
	}
}

func TestSlidingWindowMatcher_NotFound(t *testing.T) {
	script := "今天天气真好\n我想出去走走"
	m := NewSlidingWindowMatcher(script)

	// Text not in script
	pi, wi, newPos := m.Match("完全不相关的内容", 0)
	// Should return unchanged position
	if newPos != 0 {
		t.Errorf("expected pos unchanged at 0, got %d", newPos)
	}
	_ = pi
	_ = wi
}

func TestSlidingWindowMatcher_Empty(t *testing.T) {
	m := NewSlidingWindowMatcher("")
	pi, wi, pos := m.Match("something", 0)
	if pi != 0 || wi != 0 || pos != 0 {
		t.Error("empty script should return zero values")
	}
}
