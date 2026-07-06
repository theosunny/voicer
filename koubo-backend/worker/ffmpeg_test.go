package worker

import (
	"testing"
)

func TestMsToSRTTime(t *testing.T) {
	cases := []struct {
		ms       int
		expected string
	}{
		{0, "00:00:00,000"},
		{1500, "00:00:01,500"},
		{61000, "00:01:01,000"},
		{3723456, "01:02:03,456"},
	}
	for _, c := range cases {
		got := msToSRTTime(c.ms)
		if got != c.expected {
			t.Errorf("msToSRTTime(%d) = %q, want %q", c.ms, got, c.expected)
		}
	}
}

func TestSplitSentences(t *testing.T) {
	text := "今天天气真好。我们出去走走吧！感受阳光的温暖。"
	sentences := splitSentences(text)
	if len(sentences) != 3 {
		t.Errorf("expected 3 sentences, got %d: %v", len(sentences), sentences)
	}
}

func TestOssKeyFromURL(t *testing.T) {
	url := "https://mybucket.oss-cn-hangzhou.aliyuncs.com/videos/raw/abc.mp4"
	key := ossKeyFromURL(url)
	if key != "videos/raw/abc.mp4" {
		t.Errorf("expected videos/raw/abc.mp4, got %s", key)
	}
}
