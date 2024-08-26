package model

import (
	"context"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func TestGetRatingDistribution(t *testing.T) {
	t.Run("ValidInput", func(t *testing.T) {

		db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherEqual))
		require.NoError(t, err)
		defer db.Close()

		gdb, err := gorm.Open(mysql.New(mysql.Config{
			Conn:                      db,
			SkipInitializeWithVersion: true,
		}), &gorm.Config{})
		require.NoError(t, err)

		rows := sqlmock.NewRows([]string{"score", "count"}).
			AddRow(5, 10).
			AddRow(4, 20).
			AddRow(3, 30)

		mock.ExpectQuery("SELECT score, COUNT(*) AS count FROM ratings WHERE asset_id = ? AND owner = ? GROUP BY score ORDER BY score").
			WithArgs("1", "user1").
			WillReturnRows(rows)

		distributions, err := GetRatingDistribution(context.Background(), gdb, "1", "user1")
		require.NoError(t, err)
		assert.Len(t, distributions, 3)
		assert.Equal(t, int(10), distributions[0].Count)
		assert.Equal(t, int(20), distributions[1].Count)
		assert.Equal(t, int(30), distributions[2].Count)

		err = mock.ExpectationsWereMet()
		require.NoError(t, err)
	})

	t.Run("InvalidInput", func(t *testing.T) {

		db, _, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherEqual))
		require.NoError(t, err)
		defer db.Close()

		gdb, err := gorm.Open(mysql.New(mysql.Config{
			Conn:                      db,
			SkipInitializeWithVersion: true,
		}), &gorm.Config{})
		require.NoError(t, err)

		_, err = GetRatingDistribution(context.Background(), gdb, "invalid-id", "user1")
		require.Error(t, err)
		assert.Equal(t, "invalid asset id or owner", err.Error())
	})
}

func TestCalculateAverageScore(t *testing.T) {
	t.Run("NonEmptyDistributions", func(t *testing.T) {
		distributions := []RatingDistribution{
			{Score: 5, Count: 10},
			{Score: 4, Count: 20},
			{Score: 3, Count: 30},
		}

		expectedAverage := 3.7 // (5*10 + 4*20 + 3*30) / (10 + 20 + 30) = 190 / 60 = 3.1666

		average := CalculateAverageScore(distributions)

		assert.Equal(t, expectedAverage, average)
	})

	t.Run("EmptyDistributions", func(t *testing.T) {
		distributions := []RatingDistribution{}

		expectedAverage := 0.0

		average := CalculateAverageScore(distributions)

		assert.Equal(t, expectedAverage, average)
	})

	t.Run("AllZeroScores", func(t *testing.T) {
		distributions := []RatingDistribution{
			{Score: 0, Count: 10},
			{Score: 0, Count: 20},
		}

		expectedAverage := 0.0

		average := CalculateAverageScore(distributions)

		assert.Equal(t, expectedAverage, average)
	})

	t.Run("SingleRating", func(t *testing.T) {
		distributions := []RatingDistribution{
			{Score: 4, Count: 1},
		}

		expectedAverage := 4.0

		average := CalculateAverageScore(distributions)

		assert.Equal(t, expectedAverage, average)
	})
}
