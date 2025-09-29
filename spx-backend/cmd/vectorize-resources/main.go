package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/kodo"

)

var (
	configPath = flag.String("config", ".env", "Path to configuration file")
	batchSize  = flag.Int("batch", 50, "Batch size for processing")
	startID    = flag.Int64("start", 0, "Start ID for processing")
	endID      = flag.Int64("end", 0, "End ID for processing (0 means no limit)")
	dryRun     = flag.Bool("dry-run", false, "Dry run mode - show what would be processed without actually doing it")
	verbose    = flag.Bool("verbose", false, "Verbose output")
)

func main() {
	flag.Parse()

	// Load configuration
	cfg, err := loadConfig(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize database
	db, err := initDB(cfg.Database.DSN)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize algorithm service
	algorithmService := controller.NewAlgorithmService(&cfg.Algorithm)

	// Initialize kodo client
	kodoClient := kodo.NewClient(cfg.Kodo)

	// Create vectorizer
	vectorizer := &ResourceVectorizer{
		db:               db,
		algorithmService: algorithmService,
		kodoClient:       kodoClient,
		verbose:          *verbose,
	}

	ctx := context.Background()

	fmt.Printf("🚀 Starting Asset vectorization tool\n")
	fmt.Printf("Configuration:\n")
	fmt.Printf("  - Batch size: %d\n", *batchSize)
	fmt.Printf("  - Start ID: %d\n", *startID)
	fmt.Printf("  - End ID: %d\n", *endID)
	fmt.Printf("  - Dry run: %v\n", *dryRun)
	fmt.Printf("  - Algorithm endpoint: %s\n", algorithmService.GetEndpoint())
	fmt.Printf("\n")

	// Check algorithm service health (skip if health endpoint not available)
	if !*dryRun {
		fmt.Printf("🔍 Checking algorithm service health...")
		if err := algorithmService.HealthCheck(ctx); err != nil {
			fmt.Printf(" ⚠️  Skipped (health endpoint not available)\n")
			fmt.Printf("Will attempt to proceed with vectorization...\n\n")
		} else {
			fmt.Printf(" ✅ OK\n\n")
		}
	}

	// Process only asset resources
	fmt.Printf("📊 Processing asset resources...\n")
	stats, err := vectorizer.VectorizeAssets(ctx, *batchSize, *startID, *endID, *dryRun)
	if err != nil {
		log.Fatalf("❌ Failed to process assets: %v", err)
	}

	// Print final summary
	fmt.Printf("🎉 Asset vectorization completed!\n")
	fmt.Printf("Results: %s\n", stats.String())

	if len(stats.Errors) > 0 {
		fmt.Printf("\n❌ Errors encountered:\n")
		for i, err := range stats.Errors {
			fmt.Printf("  %d. %s\n", i+1, err)
		}
	}
}

type ResourceVectorizer struct {
	db               *gorm.DB
	algorithmService *controller.AlgorithmService
	kodoClient       *kodo.Client
	verbose          bool
}

type VectorizeStats struct {
	TotalProcessed int
	SuccessCount   int
	FailureCount   int
	Errors         []string
	ProcessedIDs   []int64
	StartTime      time.Time
	EndTime        time.Time
}

func (s *VectorizeStats) Add(other VectorizeStats) {
	s.TotalProcessed += other.TotalProcessed
	s.SuccessCount += other.SuccessCount
	s.FailureCount += other.FailureCount
	s.Errors = append(s.Errors, other.Errors...)
	s.ProcessedIDs = append(s.ProcessedIDs, other.ProcessedIDs...)
}

func (s VectorizeStats) String() string {
	duration := s.EndTime.Sub(s.StartTime)
	return fmt.Sprintf("Total: %d, Success: %d, Failed: %d, Duration: %v",
		s.TotalProcessed, s.SuccessCount, s.FailureCount, duration.Truncate(time.Millisecond))
}

func (v *ResourceVectorizer) VectorizeAssets(ctx context.Context, batchSize int, startID, endID int64, dryRun bool) (VectorizeStats, error) {
	stats := VectorizeStats{
		StartTime: time.Now(),
		Errors:    []string{},
	}

	err := v.vectorizeAssets(ctx, batchSize, startID, endID, dryRun, &stats)
	stats.EndTime = time.Now()
	return stats, err
}

// SimpleAsset 简化的Asset结构体，只包含必需字段
type SimpleAsset struct {
	ID          int64  `json:"id"`
	DisplayName string `json:"display_name"`
	Files       string `json:"files"` // 存储为JSON字符串，稍后解析
}

func (v *ResourceVectorizer) vectorizeAssets(ctx context.Context, batchSize int, startID, endID int64, dryRun bool, stats *VectorizeStats) error {
	// 先统计总数
	countSQL := "SELECT COUNT(*) FROM asset WHERE deleted_at IS NULL"
	var countArgs []interface{}
	if startID > 0 {
		countSQL += " AND id >= ?"
		countArgs = append(countArgs, startID)
	}
	if endID > 0 {
		countSQL += " AND id <= ?"
		countArgs = append(countArgs, endID)
	}

	var totalCount int64
	if err := v.db.WithContext(ctx).Raw(countSQL, countArgs...).Scan(&totalCount).Error; err != nil {
		return fmt.Errorf("failed to count assets: %w", err)
	}

	if v.verbose {
		fmt.Printf("  Found %d total assets to process\n", totalCount)
	}

	stats.TotalProcessed = int(totalCount)

	// 分批处理所有数据
	processed := 0
	offset := 0

	for {
		// 使用原生SQL只查询需要的字段
		sql := "SELECT id, display_name, files FROM asset WHERE deleted_at IS NULL"
		var args []interface{}

		if startID > 0 {
			sql += " AND id >= ?"
			args = append(args, startID)
		}
		if endID > 0 {
			sql += " AND id <= ?"
			args = append(args, endID)
		}

		sql += " LIMIT ? OFFSET ?"
		args = append(args, batchSize, offset)

		// 使用原生SQL查询避免GORM字段映射问题
		sqlDB, err := v.db.DB()
		if err != nil {
			return fmt.Errorf("failed to get database connection: %w", err)
		}

		rows, err := sqlDB.QueryContext(ctx, sql, args...)
		if err != nil {
			if v.verbose {
				fmt.Printf("  ⚠️  Database query error: %v\n", err)
			}
			break
		}
		defer rows.Close()

		var assets []SimpleAsset
		for rows.Next() {
			var asset SimpleAsset
			err := rows.Scan(&asset.ID, &asset.DisplayName, &asset.Files)
			if err != nil {
				if v.verbose {
					fmt.Printf("  ⚠️  Row scan error: %v\n", err)
				}
				continue
			}
			assets = append(assets, asset)
		}

		// 检查是否有数据
		if v.verbose {
			fmt.Printf("  Retrieved %d assets in this batch\n", len(assets))
		}

		// 如果没有更多数据，退出循环
		if len(assets) == 0 {
			break
		}

		if v.verbose {
			fmt.Printf("  Processing batch %d-%d of %d\n", offset+1, offset+len(assets), totalCount)
		}

		// 处理当前批次的每个资源
		for i, asset := range assets {
			if v.verbose && (processed+i)%10 == 0 {
				fmt.Printf("  Overall progress: %d/%d\n", processed+i+1, totalCount)
			}

			stats.ProcessedIDs = append(stats.ProcessedIDs, asset.ID)

			if dryRun {
				// 在干跑模式中，只解析文件信息
				imageFiles := v.extractImageFiles(asset.Files)
				if v.verbose {
					fmt.Printf("  [DRY RUN] Asset %d: %s (found %d images)\n",
						asset.ID, asset.DisplayName, len(imageFiles))
					if len(imageFiles) > 0 {
						fmt.Printf("    - First image: %s\n", imageFiles[0].KodoURL)
					}
				}
				stats.SuccessCount++
				continue
			}

			// 获取第一个图片文件进行向量化
			imageFiles := v.extractImageFiles(asset.Files)
			if len(imageFiles) == 0 {
				if v.verbose {
					fmt.Printf("  ⚠️  Asset %d: %s (no image files found)\n", asset.ID, asset.DisplayName)
				}
				stats.SuccessCount++ // 记为成功，因为不是错误
				continue
			}

			// 使用第一个图片文件
			firstImage := imageFiles[0]

			// 获取图片数据
			imageData, err := v.getImageDataFromKodo(ctx, firstImage.KodoURL, firstImage.OriginalPath)
			if err != nil {
				errorMsg := fmt.Sprintf("Asset %d failed to get image data: %v", asset.ID, err)
				stats.Errors = append(stats.Errors, errorMsg)
				stats.FailureCount++
				if v.verbose {
					fmt.Printf("  ❌ %s\n", errorMsg)
				}
				continue
			}

			// 调用向量服务
			if err := v.algorithmService.AddVector(ctx, asset.ID, firstImage.KodoURL, imageData); err != nil {
				errorMsg := fmt.Sprintf("Asset %d vectorization failed: %v", asset.ID, err)
				stats.Errors = append(stats.Errors, errorMsg)
				stats.FailureCount++
				if v.verbose {
					fmt.Printf("  ❌ %s\n", errorMsg)
				}
				continue
			}

			stats.SuccessCount++
			if v.verbose {
				fmt.Printf("  ✅ Asset %d: %s (vectorized with %s)\n", asset.ID, asset.DisplayName, firstImage.KodoURL)
			}
		}

		// 更新处理计数和偏移量
		processed += len(assets)
		offset += batchSize

		if v.verbose {
			fmt.Printf("  Completed batch. Progress: %d/%d (%.1f%%)\n",
				processed, totalCount, float64(processed)/float64(totalCount)*100)
		}
	}

	return nil
}


// ImageFile 表示图片文件信息
type ImageFile struct {
	OriginalPath string
	KodoURL      string
}

// extractImageFiles 从asset.Files JSON字符串中提取图片文件的kodo链接
func (v *ResourceVectorizer) extractImageFiles(filesJSON string) []ImageFile {
	var imageFiles []ImageFile

	// 只处理SVG格式的资源
	imageExts := map[string]bool{
		".svg": true,
	}

	// 解析JSON字符串
	var files map[string]string
	if err := json.Unmarshal([]byte(filesJSON), &files); err != nil {
		if v.verbose {
			fmt.Printf("  ⚠️  Failed to parse files JSON: %v\n", err)
		}
		return imageFiles
	}

	for filePath, fileURL := range files {
		// 检查是否是图片文件
		ext := strings.ToLower(filepath.Ext(filePath))
		if imageExts[ext] {
			// 确保是kodo链接
			if strings.HasPrefix(fileURL, "kodo://") {
				imageFiles = append(imageFiles, ImageFile{
					OriginalPath: filePath,
					KodoURL:      fileURL,
				})
			}
		}
	}

	return imageFiles
}

// getImageDataFromKodo 从kodo获取图片数据
func (v *ResourceVectorizer) getImageDataFromKodo(ctx context.Context, kodoURL, originalPath string) ([]byte, error) {
	// 移除任何引号
	kodoURL = strings.Trim(kodoURL, "\"'")

	// 解析kodo URL格式: kodo://bucket/path
	if !strings.HasPrefix(kodoURL, "kodo://") {
		return nil, fmt.Errorf("invalid kodo URL format: %s", kodoURL)
	}

	// 移除kodo://前缀
	urlPath := strings.TrimPrefix(kodoURL, "kodo://")
	parts := strings.SplitN(urlPath, "/", 2)
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid kodo URL path: %s", kodoURL)
	}

	bucket := parts[0]
	filePath := parts[1]

	// 验证bucket（可选）
	expectedBucket := "goplus-builder-usercontent-test"
	if bucket != expectedBucket {
		if v.verbose {
			fmt.Printf("    ⚠️  Bucket name '%s' doesn't match expected '%s'\n", bucket, expectedBucket)
		}
	}

	// 构造HTTP URL - 直接使用kodo URL中的文件路径
	baseURL := "https://builder-usercontent-test.gopluscdn.com"
	downloadURL := fmt.Sprintf("%s/%s", baseURL, filePath)

	if v.verbose {
		fmt.Printf("    🔗 Downloading from: %s\n", downloadURL)
		fmt.Printf("    📁 Original path: %s\n", originalPath)
		fmt.Printf("    🎯 Kodo URL: %s\n", kodoURL)
	}

	// 通过HTTP下载文件
	imageData, err := v.downloadFileHTTP(ctx, downloadURL)
	if err != nil {
		return nil, fmt.Errorf("failed to download from kodo: %w", err)
	}

	return imageData, nil
}

// downloadFileHTTP 通过HTTP下载文件
func (v *ResourceVectorizer) downloadFileHTTP(ctx context.Context, url string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to download file: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("download failed with status: %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	return data, nil
}

func loadConfig(configPath string) (*config.Config, error) {
	// 简单的配置加载逻辑，直接使用项目的环境变量名称
	cfg := &config.Config{}

	// 从环境变量加载算法服务配置
	if endpoint := os.Getenv("ALGORITHM_ENDPOINT"); endpoint != "" {
		cfg.Algorithm.Endpoint = endpoint
	} else {
		cfg.Algorithm.Endpoint = "http://localhost:5000" // 使用项目配置的默认值
	}

	// 从环境变量加载数据库配置 - 使用项目的变量名
	if dsn := os.Getenv("GOP_SPX_DSN"); dsn != "" {
		cfg.Database.DSN = dsn
	} else if dsn := os.Getenv("DATABASE_DSN"); dsn != "" {
		cfg.Database.DSN = dsn
	} else {
		return nil, fmt.Errorf("GOP_SPX_DSN or DATABASE_DSN environment variable is required")
	}

	// 从环境变量加载Kodo配置 - 使用项目的变量名
	cfg.Kodo.AccessKey = os.Getenv("KODO_AK")
	cfg.Kodo.SecretKey = os.Getenv("KODO_SK")
	cfg.Kodo.Bucket = os.Getenv("KODO_BUCKET")
	cfg.Kodo.BucketRegion = os.Getenv("KODO_BUCKET_REGION")
	cfg.Kodo.BaseURL = os.Getenv("KODO_BASE_URL")

	// 检查必需的Kodo配置
	if cfg.Kodo.AccessKey == "" || cfg.Kodo.SecretKey == "" {
		return nil, fmt.Errorf("KODO_AK and KODO_SK environment variables are required")
	}

	return cfg, nil
}

func initDB(dsn string) (*gorm.DB, error) {
	// 确保DSN包含parseTime参数
	if !strings.Contains(dsn, "parseTime=True") {
		if strings.Contains(dsn, "?") {
			dsn += "&parseTime=True"
		} else {
			dsn += "?parseTime=True"
		}
	}

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}
	return db, nil
}
