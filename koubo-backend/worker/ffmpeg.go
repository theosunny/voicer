package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"koubo-backend/model"
	"koubo-backend/repo"
	"koubo-backend/storage"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/hibiken/asynq"
)

type FFmpegWorker struct {
	videoRepo *repo.VideoRepo
	ossClient *storage.OSSClient
}

func NewFFmpegWorker(videoRepo *repo.VideoRepo, ossClient *storage.OSSClient) *FFmpegWorker {
	return &FFmpegWorker{videoRepo: videoRepo, ossClient: ossClient}
}

// HandleVideoProcess is the Asynq task handler for TypeVideoProcess.
func (w *FFmpegWorker) HandleVideoProcess(ctx context.Context, t *asynq.Task) error {
	var payload VideoProcessPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("invalid payload: %w", err)
	}
	return w.processVideo(ctx, payload.VideoID)
}

func (w *FFmpegWorker) processVideo(ctx context.Context, videoID string) error {
	video, err := w.videoRepo.GetByID(ctx, videoID)
	if err != nil {
		return fmt.Errorf("fetch video %s: %w", videoID, err)
	}

	tmpDir, err := os.MkdirTemp("", "koubo-"+videoID)
	if err != nil {
		return err
	}
	defer os.RemoveAll(tmpDir)

	// Determine file extension from the raw filename stored in DB
	ext := filepath.Ext(video.RawVideoURL)
	if ext == "" {
		ext = ".mp3"
	}

	// Get raw file — either from OSS or local disk
	rawPath := filepath.Join(tmpDir, "raw"+ext)
	if w.ossClient == nil {
		// Local file: RawVideoURL is just "<id>.mp3", look in uploads/
		localFile := filepath.Join("uploads", video.RawVideoURL)
		src, err := os.Open(localFile)
		if err != nil {
			return w.fail(ctx, videoID, fmt.Sprintf("open local file %s: %v", localFile, err))
		}
		defer src.Close()
		dst, err := os.Create(rawPath)
		if err != nil {
			return w.fail(ctx, videoID, fmt.Sprintf("create tmp file: %v", err))
		}
		defer dst.Close()
		if _, err := io.Copy(dst, src); err != nil {
			return w.fail(ctx, videoID, fmt.Sprintf("copy file: %v", err))
		}
	} else {
		if err := w.downloadToFile(ctx, video.RawVideoURL, rawPath); err != nil {
			return w.fail(ctx, videoID, fmt.Sprintf("download failed: %v", err))
		}
	}

	// For MVP: just use the raw file as output
	outPath := filepath.Join(tmpDir, "output"+ext)
	src, _ := os.Open(rawPath)
	if src != nil {
		defer src.Close()
		dst, _ := os.Create(outPath)
		if dst != nil {
			defer dst.Close()
			io.Copy(dst, src)
		}
	}

	// Upload to OSS or serve from local
	processedName := videoID + ext
	if w.ossClient != nil {
		f, err := os.Open(outPath)
		if err != nil {
			return w.fail(ctx, videoID, fmt.Sprintf("open output: %v", err))
		}
		defer f.Close()
		key := fmt.Sprintf("videos/processed/%s", processedName)
		url, err := w.ossClient.Upload(ctx, key, f)
		if err != nil {
			return w.fail(ctx, videoID, fmt.Sprintf("upload failed: %v", err))
		}
		return w.videoRepo.UpdateStatus(ctx, videoID, "completed", url, "")
	}

	// No OSS — store just the filename, frontend builds full URL
	return w.videoRepo.UpdateStatus(ctx, videoID, "completed", processedName, "")
}

func (w *FFmpegWorker) fail(ctx context.Context, videoID, msg string) error {
	_ = w.videoRepo.UpdateStatus(ctx, videoID, "failed", "", msg)
	return fmt.Errorf("%s", msg)
}

func (w *FFmpegWorker) downloadToFile(ctx context.Context, url, path string) error {
	rc, err := w.ossClient.Download(ctx, ossKeyFromURL(url))
	if err != nil {
		return err
	}
	defer rc.Close()
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, rc)
	return err
}

// ossKeyFromURL extracts the OSS object key from a full URL.
// URL format: https://bucket.oss-region.aliyuncs.com/key
func ossKeyFromURL(url string) string {
	parts := strings.SplitN(url, ".com/", 2)
	if len(parts) == 2 {
		return parts[1]
	}
	return url
}

// cutSilence uses FFmpeg to remove segments with >2s gaps between frame markers.
func cutSilence(inputPath, outputPath string, markers model.FrameMarkers) error {
	if len(markers) < 2 {
		// Not enough markers; just copy
		return runFFmpeg("-i", inputPath, "-c", "copy", outputPath)
	}

	// Sort markers by video timestamp
	sorted := make([]model.FrameMarker, len(markers))
	copy(sorted, markers)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].TimestampMs < sorted[j].TimestampMs
	})

	// Find silence gaps > 2000ms and build keep segments
	type segment struct{ start, end float64 }
	var segments []segment
	segStart := float64(sorted[0].TimestampMs) / 1000.0

	for i := 1; i < len(sorted); i++ {
		gap := sorted[i].TimestampMs - sorted[i-1].TimestampMs
		if gap > 2000 {
			// End current segment at previous marker
			segments = append(segments, segment{segStart, float64(sorted[i-1].TimestampMs) / 1000.0})
			segStart = float64(sorted[i].TimestampMs) / 1000.0
		}
	}
	// Add final segment
	last := float64(sorted[len(sorted)-1].TimestampMs) / 1000.0
	segments = append(segments, segment{segStart, last + 1.0})

	if len(segments) <= 1 {
		return runFFmpeg("-i", inputPath, "-c", "copy", outputPath)
	}

	// Build filter_complex for trim+concat
	var filterParts []string
	var concatInputs []string
	for i, seg := range segments {
		filterParts = append(filterParts,
			fmt.Sprintf("[0:v]trim=start=%.3f:end=%.3f,setpts=PTS-STARTPTS[v%d]", seg.start, seg.end, i),
			fmt.Sprintf("[0:a]atrim=start=%.3f:end=%.3f,asetpts=PTS-STARTPTS[a%d]", seg.start, seg.end, i),
		)
		concatInputs = append(concatInputs, fmt.Sprintf("[v%d][a%d]", i, i))
	}
	filterParts = append(filterParts,
		fmt.Sprintf("%sconcat=n=%d:v=1:a=1[outv][outa]", strings.Join(concatInputs, ""), len(segments)),
	)
	filter := strings.Join(filterParts, ";")

	return runFFmpeg(
		"-i", inputPath,
		"-filter_complex", filter,
		"-map", "[outv]", "-map", "[outa]",
		"-c:v", "libx264", "-preset", "fast", "-c:a", "aac",
		outputPath,
	)
}

// generateSRT creates an SRT subtitle file from ASR result text and frame markers.
func generateSRT(srtPath, asrResult string, markers model.FrameMarkers) error {
	if asrResult == "" || len(markers) < 2 {
		return fmt.Errorf("insufficient data for SRT")
	}

	sentences := splitSentences(asrResult)
	if len(sentences) == 0 {
		return fmt.Errorf("no sentences")
	}

	sorted := make([]model.FrameMarker, len(markers))
	copy(sorted, markers)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].TimestampMs < sorted[j].TimestampMs
	})

	totalMs := sorted[len(sorted)-1].TimestampMs - sorted[0].TimestampMs
	startOffset := sorted[0].TimestampMs

	f, err := os.Create(srtPath)
	if err != nil {
		return err
	}
	defer f.Close()

	totalRunes := len([]rune(asrResult))
	if totalRunes == 0 {
		return fmt.Errorf("empty asr result")
	}

	var sb strings.Builder
	cursor := 0
	for i, sentence := range sentences {
		runeLen := len([]rune(sentence))
		startRatio := float64(cursor) / float64(totalRunes)
		endRatio := float64(cursor+runeLen) / float64(totalRunes)

		startMs := int(startRatio*float64(totalMs)) + startOffset
		endMs := int(endRatio*float64(totalMs)) + startOffset
		if endMs <= startMs {
			endMs = startMs + 2000
		}

		sb.WriteString(fmt.Sprintf("%d\n%s --> %s\n%s\n\n",
			i+1,
			msToSRTTime(startMs),
			msToSRTTime(endMs),
			sentence,
		))
		cursor += runeLen
	}

	_, err = f.WriteString(sb.String())
	return err
}

// burnSubtitles uses FFmpeg to encode video with subtitles burned in.
func burnSubtitles(inputPath, srtPath, outputPath string) error {
	if srtPath == "" {
		return runFFmpeg("-i", inputPath, "-c:v", "libx264", "-preset", "fast", "-c:a", "aac", outputPath)
	}
	// Escape path for ffmpeg filter
	escaped := strings.ReplaceAll(srtPath, ":", "\\:")
	return runFFmpeg(
		"-i", inputPath,
		"-vf", fmt.Sprintf("subtitles=%s:force_style='FontSize=18,PrimaryColour=&Hffffff&'", escaped),
		"-c:v", "libx264", "-preset", "fast",
		"-c:a", "aac",
		outputPath,
	)
}

func runFFmpeg(args ...string) error {
	cmd := exec.Command("ffmpeg", append([]string{"-y"}, args...)...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("ffmpeg error: %w\noutput: %s", err, string(out))
	}
	return nil
}

func msToSRTTime(ms int) string {
	d := time.Duration(ms) * time.Millisecond
	h := int(d.Hours())
	m := int(d.Minutes()) % 60
	s := int(d.Seconds()) % 60
	millis := ms % 1000
	return fmt.Sprintf("%02d:%02d:%02d,%03d", h, m, s, millis)
}

// splitSentences splits text into sentences by Chinese punctuation.
func splitSentences(text string) []string {
	var sentences []string
	var cur strings.Builder
	for _, r := range text {
		cur.WriteRune(r)
		if r == '。' || r == '！' || r == '？' || r == '…' || r == '\n' {
			if s := strings.TrimSpace(cur.String()); s != "" {
				sentences = append(sentences, s)
			}
			cur.Reset()
		}
	}
	if s := strings.TrimSpace(cur.String()); s != "" {
		sentences = append(sentences, s)
	}
	return sentences
}
