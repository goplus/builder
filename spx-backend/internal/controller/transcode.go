// Qiniu Cloud transcoding service integration.
// References:
// - Persistent processing (pfop): https://developer.qiniu.com/dora/1291/persistent-data-processing-pfop
// - Transcoding (avthumb): https://developer.qiniu.com/dora/1248/audio-and-video-transcoding-avthumb
// - Status query (prefop): https://developer.qiniu.com/dora/1294/persistent-processing-status-query-prefop
// - Go SDK : https://developer.qiniu.com/kodo/1238/go

package controller

import (
	"context"
	"encoding/base64"

	"fmt"
	"net/url"
	"strings"
	"sync"

	"github.com/qiniu/go-sdk/v7/storage"
)

// TranscodeStatus transcoding status
type TranscodeStatus string

const (
	TranscodeStatusProcessing TranscodeStatus = "processing"
	TranscodeStatusCompleted  TranscodeStatus = "completed"
	TranscodeStatusFailed     TranscodeStatus = "failed"
)

// TranscodeResult transcoding result
type TranscodeResult struct {
	Status    TranscodeStatus `json:"status"`
	OutputURL string          `json:"outputUrl,omitempty"` // Transcoded file URL
	Error     string          `json:"error,omitempty"`     // Error message
}

// transcodeStorage interface for storing transcoding results
type transcodeStorage struct {
	mu      sync.RWMutex
	results map[string]*TranscodeResult // key: taskId, value: result
}

// Global transcoding result storage (in-memory cache)
var transcodeStore = &transcodeStorage{
	results: make(map[string]*TranscodeResult),
}

// Save saves transcoding result
func (s *transcodeStorage) Save(taskID string, result *TranscodeResult) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.results[taskID] = result
}

// Get gets transcoding result
func (s *transcodeStorage) Get(taskID string) (*TranscodeResult, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result, ok := s.results[taskID]
	return result, ok
}

// SubmitTranscodeParams parameters for submitting transcoding task
type SubmitTranscodeParams struct {
	SourceURL string `json:"sourceUrl"` // Original file's kodo URL
}

// Validate validates parameters
func (p *SubmitTranscodeParams) Validate() (ok bool, msg string) {
	if p.SourceURL == "" {
		return false, "sourceUrl is required"
	}

	// Validate if it's kodo:// format
	u, err := url.Parse(p.SourceURL)
	if err != nil {
		return false, "invalid sourceUrl format"
	}
	if u.Scheme != "kodo" {
		return false, "sourceUrl must be a kodo:// URL"
	}

	return true, ""
}

// getRegionByID gets corresponding Qiniu Cloud Region by region ID
func getRegionByID(regionID string) (*storage.Region, error) {
	switch regionID {
	case "z0", "cn-east-1":
		return &storage.ZoneHuadong, nil
	case "z1", "cn-north-1":
		return &storage.ZoneHuabei, nil
	case "z2", "cn-south-1":
		return &storage.ZoneHuanan, nil
	case "na0", "us-north-1":
		return &storage.ZoneBeimei, nil
	case "as0", "ap-southeast-1":
		return &storage.ZoneXinjiapo, nil
	default:
		return nil, fmt.Errorf("unknown region: %s", regionID)
	}
}

// SubmitTranscodeResponse response for submitting transcoding task
type SubmitTranscodeResponse struct {
	TaskID            string `json:"taskId"`            // Transcoding task ID
	ExpectedOutputURL string `json:"expectedOutputUrl"` // Expected output file URL
}

// SubmitTranscode submits video transcoding task
func (ctrl *Controller) SubmitTranscode(ctx context.Context, params *SubmitTranscodeParams) (*SubmitTranscodeResponse, error) {
	sourceURL, err := url.Parse(params.SourceURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse source URL: %w", err)
	}

	bucket := sourceURL.Host
	sourceKey := strings.TrimPrefix(sourceURL.Path, "/")

	outputKey := strings.TrimSuffix(sourceKey, ".webm") + ".mp4"

	// Construct transcoding command
	// avthumb/mp4: Basic transcoding to MP4 format (defaults to H.264, also known as AVC encoding)
	fops := "avthumb/mp4"

	// Add saveas parameter to specify output file location
	// saveas format: Base64UrlSafe(bucket:key)
	saveAsEntry := fmt.Sprintf("%s:%s", bucket, outputKey)
	saveAsEncoded := base64.URLEncoding.EncodeToString([]byte(saveAsEntry))
	fops = fmt.Sprintf("%s|saveas/%s", fops, saveAsEncoded)

	// Get corresponding Zone based on configured region
	region, err := getRegionByID(ctrl.kodo.bucketRegion)
	if err != nil {
		return nil, fmt.Errorf("failed to get region: %w", err)
	}

	// Configure persistent processing operation
	pfopManager := storage.NewOperationManager(ctrl.kodo.cred, &storage.Config{
		Region:   region,
		UseHTTPS: true,
	})

	// Submit persistent processing task (the notifyURL is optional)
	persistentID, err := pfopManager.Pfop(bucket, sourceKey, fops, "", "", true)
	if err != nil {
		return nil, fmt.Errorf("failed to submit transcode task: %w", err)
	}

	// Initialize transcoding status as processing
	transcodeStore.Save(persistentID, &TranscodeResult{
		Status: TranscodeStatusProcessing,
	})

	// Construct expected output URL
	expectedOutputURL := fmt.Sprintf("kodo://%s/%s", bucket, outputKey)

	return &SubmitTranscodeResponse{
		TaskID:            persistentID,
		ExpectedOutputURL: expectedOutputURL,
	}, nil
}

// GetTranscodeStatus queries transcoding status
func (ctrl *Controller) GetTranscodeStatus(ctx context.Context, taskID string) (*TranscodeResult, error) {
	result, ok := transcodeStore.Get(taskID)

	if ok && (result.Status == TranscodeStatusCompleted || result.Status == TranscodeStatusFailed) {
		return result, nil
	}

	// Actively query Qiniu Cloud
	region, err := getRegionByID(ctrl.kodo.bucketRegion)
	if err != nil {
		return nil, fmt.Errorf("failed to get region: %w", err)
	}

	cfg := &storage.Config{
		Region:   region,
		UseHTTPS: true,
	}

	operationManager := storage.NewOperationManager(ctrl.kodo.cred, cfg)

	qiniuResult, err := operationManager.Prefop(taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to query transcode status from qiniu: %w", err)
	}

	return ctrl.updateTranscodeResult(taskID, qiniuResult.Code, qiniuResult.Items, qiniuResult.Desc, true)
}

// updateTranscodeResult updates transcoding status based on Qiniu Cloud return result
// deleteSource: whether to delete the original file
func (ctrl *Controller) updateTranscodeResult(taskID string, code int, items []storage.FopResult, desc string, deleteSource bool) (*TranscodeResult, error) {
	var result *TranscodeResult

	switch code {
	case 0:
		// Transcoding successful (there is only one transcoding task)
		if len(items) > 0 && items[0].Code == 0 {
			outputKey := items[0].Key
			outputURL := fmt.Sprintf("kodo://%s/%s", ctrl.kodo.bucket, outputKey)

			result = &TranscodeResult{
				Status:    TranscodeStatusCompleted,
				OutputURL: outputURL,
			}

			if deleteSource {
				sourceKey := strings.TrimSuffix(outputKey, ".mp4") + ".webm"
				bucketManager := storage.NewBucketManager(ctrl.kodo.cred, &storage.Config{})
				_ = bucketManager.Delete(ctrl.kodo.bucket, sourceKey)
			}
		} else {
			// Error in items
			errorMsg := desc
			if len(items) > 0 && items[0].Error != "" {
				errorMsg = items[0].Error
			}

			result = &TranscodeResult{
				Status: TranscodeStatusFailed,
				Error:  errorMsg,
			}
		}
	case 3, 4:
		// code == 3: Processing failed
		// code == 4: Callback failed
		result = &TranscodeResult{
			Status: TranscodeStatusFailed,
			Error:  desc,
		}
	default:
		// code == 1: Waiting for processing
		// code == 2: Processing
		// Other unknown status
		result = &TranscodeResult{
			Status: TranscodeStatusProcessing,
		}
	}

	transcodeStore.Save(taskID, result)
	return result, nil
}
