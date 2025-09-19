package controller

import (
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/goplus/builder/spx-backend/internal/aigc"
	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/kodo"
	"github.com/goplus/builder/spx-backend/internal/model/modeltest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setTestEnv(t *testing.T) {
	t.Setenv("GOP_SPX_DSN", "root:root@tcp(mysql.example.com:3306)/builder?charset=utf8&parseTime=True")

	t.Setenv("KODO_AK", "test-kodo-ak")
	t.Setenv("KODO_SK", "test-kodo-sk")
	t.Setenv("KODO_BUCKET", "builder")
	t.Setenv("KODO_BUCKET_REGION", "earth")
	t.Setenv("KODO_BASE_URL", "https://kodo.example.com")

	t.Setenv("AIGC_ENDPOINT", "https://aigc.example.com")
}

func newTestController(t *testing.T) (ctrl *Controller, dbMock sqlmock.Sqlmock, closeDB func() error) {
	setTestEnv(t)

	db, dbMock, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)

	cfg := &config.Config{
		Kodo: config.KodoConfig{
			AccessKey:    "test-kodo-ak",
			SecretKey:    "test-kodo-sk",
			Bucket:       "builder",
			BucketRegion: "earth",
			BaseURL:      "https://kodo.example.com",
		},
		AIGC: config.AIGCConfig{
			Endpoint: "https://aigc.example.com",
		},
	}

	kodoClient := kodo.NewClient(cfg.Kodo)
	aigcClient := aigc.NewAigcClient(cfg.AIGC.Endpoint)

	return &Controller{
		db:   db,
		kodo: kodoClient,
		aigc: aigcClient,
	}, dbMock, closeDB
}

func TestSortOrder(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		assert.True(t, SortOrderAsc.IsValid())
		assert.True(t, SortOrderDesc.IsValid())
	})

	t.Run("Invalid", func(t *testing.T) {
		assert.False(t, SortOrder("invalid").IsValid())
	})
}

func TestPagination(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		p := Pagination{Index: 1, Size: 20}
		assert.True(t, p.IsValid())
	})

	t.Run("InvalidIndex", func(t *testing.T) {
		p := Pagination{Index: 0, Size: 20}
		assert.False(t, p.IsValid())
	})

	t.Run("InvalidSize", func(t *testing.T) {
		p := Pagination{Index: 1, Size: 0}
		assert.False(t, p.IsValid())
	})

	t.Run("SizeExceedsMaximum", func(t *testing.T) {
		p := Pagination{Index: 1, Size: 101}
		assert.False(t, p.IsValid())
	})

	t.Run("Offset", func(t *testing.T) {
		p := Pagination{Index: 3, Size: 20}
		assert.Equal(t, 40, p.Offset())
	})
}

func ptr[T any](v T) *T {
	return &v
}
