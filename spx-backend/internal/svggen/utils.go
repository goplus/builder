package svggen

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"
)

// DownloadFile downloads a file from the given URL.
func DownloadFile(ctx context.Context, url string) ([]byte, error) {
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("download file: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("download failed with status: %s", resp.Status)
	}

	return io.ReadAll(resp.Body)
}

// ParseSizeFromString parses size string like "1024x1024".
func ParseSizeFromString(size string) (width, height int) {
	if size == "" {
		return 1024, 1024
	}

	// Simple parsing for common formats
	switch size {
	case "512x512":
		return 512, 512
	case "1024x1024":
		return 1024, 1024
	case "1536x1536":
		return 1536, 1536
	case "2048x2048":
		return 2048, 2048
	default:
		return 1024, 1024
	}
}

// GenerateImageID generates a simple image ID.
func GenerateImageID(provider Provider) string {
	return fmt.Sprintf("%s_%d", string(provider), time.Now().UnixNano())
}
