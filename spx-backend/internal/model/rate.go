package model

import (
	"context"
	"errors"
	"math"
	"regexp"
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
	CTime time.Time `gorm:"default:current_timestamp" json:"cTime" db:"c_time"`
	UTime  time.Time `gorm:"default:current_timestamp" json:"uTime" db:"u_time"`
}

type RatingDistribution struct {
	Score int `json:"score"`
	Count int `json:"count"`
}

// GetRatingDistribution gets the distribution of ratings for an asset.
func GetRatingDistribution(ctx context.Context, db *gorm.DB, assetId string) ([]RatingDistribution, error) {
	logger := log.GetReqLogger(ctx)

	var distributions []RatingDistribution
	// avoid SQL injection,use regex to check if the assetId is valid,assetId is number string.
	isValidAssetId := regexp.MustCompile(`^\d+$`).MatchString(assetId)
	if !isValidAssetId {
		logger.Printf("invalid asset id")
		return nil, errors.New("invalid asset id")
	}

	result := db.Raw("SELECT score, COUNT(*) AS count FROM ratings WHERE asset_id = ? GROUP BY score ORDER BY score", assetId).Scan(&distributions)

	if result.Error != nil {
		logger.Printf("failed to get rate: %v", result.Error)
		return nil, result.Error
	}

	return distributions, nil
}

// CalculateAverageScore calculates the average score for an asset.
func CalculateAverageScore(distributions []RatingDistribution) float64 {
	var totalScore int
	var totalCount int

	for _, dist := range distributions {
		totalScore += dist.Score * dist.Count
		totalCount += dist.Count
	}

	if totalCount == 0 {
		return 0
	}

	averageScore := float64(totalScore) / float64(totalCount)
	return float64(math.Round(averageScore*10)) / 10 //todo(tsingper):there maybe some error
}

// InsertRate inserts a rating for an asset.
func InsertRate(ctx context.Context, db *gorm.DB, assetId string, owner string, score int) error {
    logger := log.GetReqLogger(ctx)
    assetIdInt, err := strconv.Atoi(assetId)
    if err != nil {
        logger.Printf("failed to convert asset id to int: %v", err)
        return err
    }

    var rate Ratings
    result := db.Where("asset_id = ? AND owner = ?", assetIdInt, owner).First(&rate)

    if result.Error != nil {
        if result.Error == gorm.ErrRecordNotFound {
            // Record not found, create a new one
            rate = Ratings{
                AssetID: assetIdInt,
                Owner:   owner,
                Score:   score,
            }
            result = db.Create(&rate)
            if result.Error != nil {
                logger.Printf("failed to add rate: %v", result.Error)
                return result.Error
            }
        } else {
            logger.Printf("failed to query rate: %v", result.Error)
            return result.Error
        }
    } else {
        // Record found, update the score
        rate.Score = score
        result = db.Save(&rate)
        if result.Error != nil {
            logger.Printf("failed to update rate: %v", result.Error)
            return result.Error
        }
    }

    return nil
}
