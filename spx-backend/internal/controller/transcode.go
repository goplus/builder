package controller

import (
	"context"
	"encoding/base64"

	// "errors"
	"fmt"
	"net/url"
	"strings"
	"sync"

	// "github.com/qiniu/go-sdk/v7/auth"
	"github.com/qiniu/go-sdk/v7/storage"
)

// TranscodeStatus 转码状态
type TranscodeStatus string

const (
	TranscodeStatusProcessing TranscodeStatus = "processing"
	TranscodeStatusCompleted  TranscodeStatus = "completed"
	TranscodeStatusFailed     TranscodeStatus = "failed"
)

// TranscodeResult 转码结果
type TranscodeResult struct {
	Status    TranscodeStatus `json:"status"`
	OutputURL string          `json:"outputUrl,omitempty"` // 转码后的文件 URL
	Error     string          `json:"error,omitempty"`     // 错误信息
}

// transcodeStorage 存储转码结果的接口
type transcodeStorage struct {
	mu      sync.RWMutex
	results map[string]*TranscodeResult // key: taskId, value: result
}

// 全局转码结果存储(内存缓存)
var transcodeStore = &transcodeStorage{
	results: make(map[string]*TranscodeResult),
}

// Save 保存转码结果
func (s *transcodeStorage) Save(taskID string, result *TranscodeResult) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.results[taskID] = result
}

// Get 获取转码结果
func (s *transcodeStorage) Get(taskID string) (*TranscodeResult, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result, ok := s.results[taskID]
	return result, ok
}

// SubmitTranscodeParams 提交转码任务的参数
type SubmitTranscodeParams struct {
	SourceURL string `json:"sourceUrl"` // 原始文件的 kodo URL
}

// Validate 验证参数
func (p *SubmitTranscodeParams) Validate() (ok bool, msg string) {
	if p.SourceURL == "" {
		return false, "sourceUrl is required"
	}

	// 验证是否是 kodo:// 格式
	u, err := url.Parse(p.SourceURL)
	if err != nil {
		return false, "invalid sourceUrl format"
	}
	if u.Scheme != "kodo" {
		return false, "sourceUrl must be a kodo:// URL"
	}

	return true, ""
}

// getRegionByID 根据 region ID 获取对应的七牛云 Region
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

// SubmitTranscodeResponse 提交转码任务的响应
type SubmitTranscodeResponse struct {
	TaskID            string `json:"taskId"`            // 转码任务 ID
	ExpectedOutputURL string `json:"expectedOutputUrl"` // 预期的输出文件 URL
}

// SubmitTranscode 提交视频转码任务
func (ctrl *Controller) SubmitTranscode(ctx context.Context, params *SubmitTranscodeParams) (*SubmitTranscodeResponse, error) {
	// 1. 解析源文件 URL
	sourceURL, err := url.Parse(params.SourceURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse source URL: %w", err)
	}

	// 提取 bucket 和 key
	bucket := sourceURL.Host
	sourceKey := strings.TrimPrefix(sourceURL.Path, "/")

	// 2. 构造输出文件路径 (将 .webm 改为 .mp4)
	outputKey := strings.TrimSuffix(sourceKey, ".webm") + ".mp4"

	// 3. 构造转码命令
	// avthumb/mp4: 基础转码为 MP4 格式
	fops := fmt.Sprintf("avthumb/mp4")

	// 4. 添加 saveas 参数,指定输出文件位置
	// saveas 格式: Base64UrlSafe(bucket:key)
	saveAsEntry := fmt.Sprintf("%s:%s", bucket, outputKey)
	saveAsEncoded := base64.URLEncoding.EncodeToString([]byte(saveAsEntry))
	fops = fmt.Sprintf("%s|saveas/%s", fops, saveAsEncoded)

	// 5. 根据配置的 region 获取对应的 Zone
	region, err := getRegionByID(ctrl.kodo.bucketRegion)
	if err != nil {
		return nil, fmt.Errorf("failed to get region: %w", err)
	}

	// 配置持久化处理操作
	pfopManager := storage.NewOperationManager(ctrl.kodo.cred, &storage.Config{
		Region:   region,
		UseHTTPS: true,
	})

	// 6. 提交持久化处理任务
	notifyURL := "https://goplus-builder-trailhead-sharing.qiniu.io/api/transcode/callback"
	persistentID, err := pfopManager.Pfop(bucket, sourceKey, fops, "", notifyURL, true)
	if err != nil {
		return nil, fmt.Errorf("failed to submit transcode task: %w", err)
	}

	// 7. 初始化转码状态为 processing
	transcodeStore.Save(persistentID, &TranscodeResult{
		Status: TranscodeStatusProcessing,
	})

	// 8. 构造预期的输出 URL
	expectedOutputURL := fmt.Sprintf("kodo://%s/%s", bucket, outputKey)

	return &SubmitTranscodeResponse{
		TaskID:            persistentID,
		ExpectedOutputURL: expectedOutputURL,
	}, nil
}

// GetTranscodeStatus 查询转码状态
func (ctrl *Controller) GetTranscodeStatus(ctx context.Context, taskID string) (*TranscodeResult, error) {
	// 1. 先从缓存中查询
	result, ok := transcodeStore.Get(taskID)

	// 2. 如果缓存中已经有结果,直接返回
	if ok && (result.Status == TranscodeStatusCompleted || result.Status == TranscodeStatusFailed) {
		return result, nil
	}

	// 3. 主动查询七牛云
	region, err := getRegionByID(ctrl.kodo.bucketRegion)
	if err != nil {
		return nil, fmt.Errorf("failed to get region: %w", err)
	}

	// 创建完整的 Config
	cfg := &storage.Config{
		Region:   region,
		UseHTTPS: true, // ← 添加这个
	}

	operationManager := storage.NewOperationManager(ctrl.kodo.cred, cfg)

	qiniuResult, err := operationManager.Prefop(taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to query transcode status from qiniu: %w", err)
	}

	// 4. 更新转码结果
	return ctrl.updateTranscodeResult(taskID, qiniuResult.Code, qiniuResult.Items, qiniuResult.Desc, false)
}

// QiniuPfopCallbackParams 七牛云持久化处理回调参数
type QiniuPfopCallbackParams struct {
	ID    string                  `json:"id"`    // 持久化处理的进程ID
	Code  int                     `json:"code"`  // 状态码,0表示成功
	Desc  string                  `json:"desc"`  // 状态描述
	Items []QiniuPfopCallbackItem `json:"items"` // 处理结果详情
}

// QiniuPfopCallbackItem 七牛云回调的单个处理项
type QiniuPfopCallbackItem struct {
	Cmd   string `json:"cmd"`   // 处理命令
	Code  int    `json:"code"`  // 状态码,0表示成功
	Desc  string `json:"desc"`  // 状态描述
	Key   string `json:"key"`   // 输出文件的key
	Hash  string `json:"hash"`  // 输出文件的hash
	Error string `json:"error"` // 错误信息
}

// HandleTranscodeCallback 处理七牛云转码完成回调
func (ctrl *Controller) HandleTranscodeCallback(ctx context.Context, params *QiniuPfopCallbackParams) error {
	// 将 QiniuPfopCallbackItem 转换为 storage.FopResult
	items := make([]storage.FopResult, len(params.Items))
	for i, item := range params.Items {
		items[i] = storage.FopResult{
			Cmd:   item.Cmd,
			Code:  item.Code,
			Desc:  item.Desc,
			Key:   item.Key,
			Hash:  item.Hash,
			Error: item.Error,
		}
	}

	// 更新转码结果,并删除原始文件
	_, err := ctrl.updateTranscodeResult(params.ID, params.Code, items, params.Desc, true)
	return err
}

// updateTranscodeResult 根据七牛云返回结果更新转码状态
// deleteSource: 是否删除原始文件
func (ctrl *Controller) updateTranscodeResult(taskID string, code int, items []storage.FopResult, desc string, deleteSource bool) (*TranscodeResult, error) {
	var result *TranscodeResult

	switch code {
	case 0:
		// 转码成功
		if len(items) > 0 && items[0].Code == 0 {
			outputKey := items[0].Key
			outputURL := fmt.Sprintf("kodo://%s/%s", ctrl.kodo.bucket, outputKey)

			result = &TranscodeResult{
				Status:    TranscodeStatusCompleted,
				OutputURL: outputURL,
			}

			// 如果需要删除原始文件
			if deleteSource {
				sourceKey := strings.TrimSuffix(outputKey, ".mp4") + ".webm"
				bucketManager := storage.NewBucketManager(ctrl.kodo.cred, &storage.Config{})
				_ = bucketManager.Delete(ctrl.kodo.bucket, sourceKey)
			}
		} else {
			// items 中有错误
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
		// code == 3: 处理失败
		// code == 4: 回调失败
		result = &TranscodeResult{
			Status: TranscodeStatusFailed,
			Error:  desc,
		}
	default:
		// code == 1: 等待处理
		// code == 2: 正在处理
		// 其他未知状态
		result = &TranscodeResult{
			Status: TranscodeStatusProcessing,
		}
	}

	transcodeStore.Save(taskID, result)
	return result, nil
}
