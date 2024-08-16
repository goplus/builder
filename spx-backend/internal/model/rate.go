package model

import (
	"context"
	"strconv"
	"time"

	"github.com/goplus/builder/spx-backend/internal/log"
	"gorm.io/gorm"
)

type Ratings struct {
	ID        int       `gorm:"primaryKey;autoIncrement" json:"id"`
	AssetID   int       `gorm:"not null" json:"asset_id"`
	Owner     string    `json:"owner"`
	Score     int       `gorm:"check:score >= 1 AND score <= 5" json:"score"`
	CreatedAt time.Time `gorm:"default:current_timestamp" json:"created_at"`
}

type RatingDistribution struct {
	Score int `json:"score"`
	Count int `json:"count"`
}

func GetRatingDistribution(ctx context.Context, db *gorm.DB, assetId string, owner string) ([]RatingDistribution, error) {
	logger := log.GetReqLogger(ctx)

	// 创建一个切片来保存结果
	var distributions []RatingDistribution

	// 执行查询
	result := db.Raw("SELECT score, COUNT(*) AS count FROM ratings WHERE asset_id = ? AND owner = ? GROUP BY score ORDER BY score", assetId, owner).Scan(&distributions)

	// 检查查询错误
	if result.Error != nil {
		logger.Printf("failed to get rate: %v", result.Error)
		return nil, result.Error
	}

	// 返回结果
	return distributions, nil
}

// CalculateAverageScore 根据评分分布切片计算平均评分
func CalculateAverageScore(distributions []RatingDistribution) float64 {
	var totalScore int
	var totalCount int

	// 遍历切片，累加总评分和总次数
	for _, dist := range distributions {
		totalScore += dist.Score * dist.Count
		totalCount += dist.Count
	}

	// 计算平均评分
	if totalCount == 0 {
		return 0 // 避免除以零
	}

	averageScore := float64(totalScore) / float64(totalCount)
	// fomrat to 1 decimal place
	return float64(int(averageScore*10)) / 10
}

func InsertRate(ctx context.Context, db *gorm.DB, assetId string, owner string, score int) error {
	logger := log.GetReqLogger(ctx)
	assetIdInt, err := strconv.Atoi(assetId)
	if err != nil {
		logger.Printf("failed to convert asset id to int: %v", err)
		return err
	}
	// 创建一个 Ratings 实例
	rate := Ratings{
		AssetID: assetIdInt,
		Owner:   owner,
		Score:   score,
	}

	// 执行插入
	result := db.Create(&rate)

	// 检查插入错误
	if result.Error != nil {
		logger.Printf("failed to add rate: %v", result.Error)
		return result.Error
	}

	// 返回 nil 表示没有错误
	return nil
}
