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

	// Submit persistent processing task without callback (uses polling-based status check)
	persistentID, err := pfopManager.Pfop(bucket, sourceKey, fops, "", "", true)
	if err != nil {
		return nil, fmt.Errorf("failed to submit transcode task: %w", err)
	}

	// Construct expected output URL
	expectedOutputURL := fmt.Sprintf("kodo://%s/%s", bucket, outputKey)

	return &SubmitTranscodeResponse{
		TaskID:            persistentID,
		ExpectedOutputURL: expectedOutputURL,
	}, nil
}

// GetTranscodeStatus queries transcoding status from Qiniu Cloud
func (ctrl *Controller) GetTranscodeStatus(ctx context.Context, taskID string) (*TranscodeResult, error) {
	// Get region configuration
	region, err := getRegionByID(ctrl.kodo.bucketRegion)
	if err != nil {
		return nil, fmt.Errorf("failed to get region: %w", err)
	}

	// Create operation manager
	operationManager := storage.NewOperationManager(ctrl.kodo.cred, &storage.Config{
		Region:   region,
		UseHTTPS: true,
	})

	// Query transcoding status from Qiniu Cloud
	qiniuResult, err := operationManager.Prefop(taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to query transcode status from qiniu: %w", err)
	}

	// Parse result and construct response
	var result *TranscodeResult

	switch qiniuResult.Code {
	case 0:
		// Task completed - check item status for actual transcoding result
		if len(qiniuResult.Items) > 0 && qiniuResult.Items[0].Code == 0 {
			// Transcoding successful
			outputKey := qiniuResult.Items[0].Key
			outputURL := fmt.Sprintf("kodo://%s/%s", ctrl.kodo.bucket, outputKey)

			result = &TranscodeResult{
				Status:    TranscodeStatusCompleted,
				OutputURL: outputURL,
			}

			// Delete original source file using InputKey from Qiniu response
			if qiniuResult.InputKey != "" {
				bucketManager := storage.NewBucketManager(ctrl.kodo.cred, &storage.Config{
					Region:   region,
					UseHTTPS: true,
				})

				if err := bucketManager.Delete(ctrl.kodo.bucket, qiniuResult.InputKey); err != nil {
					// Log error but don't fail the request since transcoding succeeded
					fmt.Printf("failed to delete source file %s: %v\n", qiniuResult.InputKey, err)
				}
			}
		} else {
			// Transcoding failed (items contain error)
			errorMsg := qiniuResult.Desc
			if len(qiniuResult.Items) > 0 && qiniuResult.Items[0].Error != "" {
				errorMsg = qiniuResult.Items[0].Error
			}

			result = &TranscodeResult{
				Status: TranscodeStatusFailed,
				Error:  errorMsg,
			}
		}
	case 3, 4:
		// code=3: Processing failed
		// code=4: Notification callback failed
		result = &TranscodeResult{
			Status: TranscodeStatusFailed,
			Error:  qiniuResult.Desc,
		}
	default:
		// code=1: Waiting for processing (queued)
		// code=2: Processing in progress
		// Other unknown status codes
		result = &TranscodeResult{
			Status: TranscodeStatusProcessing,
		}
	}

	return result, nil
}
