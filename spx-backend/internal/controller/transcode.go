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
	"time"

	"fmt"
	"net/url"
	"strings"

	"github.com/hashicorp/golang-lru/v2/expirable"
	"github.com/qiniu/go-sdk/v7/storage"
)

// TranscodeStatus transcoding status
type TranscodeStatus string

const (
	TranscodeStatusProcessing TranscodeStatus = "processing"
	TranscodeStatusCompleted  TranscodeStatus = "completed"
	TranscodeStatusFailed     TranscodeStatus = "failed"
)

// Global transcoding result storage using LRU cache with TTL.
// Automatically evicts least recently used entries and expires old entries.
// - Max size: 10000 entries (prevents unbounded growth)
// - TTL: 24 hours (completed/failed tasks expire after 1 day)
// Thread-safe by design, no manual locking needed.
var transcodeStore = expirable.NewLRU[string, *TranscodeResult](
	10000,        // max 10,000 entries
	nil,          // no eviction callback
	24*time.Hour, // TTL: 24 hours
)

// TranscodeResult transcoding result
type TranscodeResult struct {
	Status    TranscodeStatus `json:"status"`
	OutputURL string          `json:"outputUrl,omitempty"` // Transcoded file URL
	Error     string          `json:"error,omitempty"`
	SourceKey string          `json:"-"` // Original file key for deletion (not exposed to frontend)
}

// SubmitTranscodeParams parameters for submitting transcoding task
type SubmitTranscodeParams struct {
	SourceURL string `json:"sourceUrl"` // Original file's kodo URL
}

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
	transcodeStore.Add(persistentID, &TranscodeResult{
		Status:    TranscodeStatusProcessing,
		SourceKey: sourceKey, // Save original file key for later deletion
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
				oldResult, ok := transcodeStore.Get(taskID)
				if !ok || oldResult.SourceKey == "" {
					fmt.Printf("warning: source key not found in cache for taskID %s\n", taskID)
				} else {
					sourceKey := oldResult.SourceKey

					region, err := getRegionByID(ctrl.kodo.bucketRegion)
					if err != nil {
						fmt.Printf("failed to get region for deletion: %v\n", err)
					} else {
						bucketManager := storage.NewBucketManager(ctrl.kodo.cred, &storage.Config{
							Region:   region,
							UseHTTPS: true,
						})

						if err := bucketManager.Delete(ctrl.kodo.bucket, sourceKey); err != nil {
							fmt.Printf("failed to delete source file %s: %v\n", sourceKey, err)
						}
					}
				}
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

	transcodeStore.Add(taskID, result)
	return result, nil
}
