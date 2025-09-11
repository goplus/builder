package controller

import (
	"context"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// TestAssetCompletionService_Basic 基本功能测试
func TestAssetCompletionService_Basic(t *testing.T) {
	// 创建 mock 数据库
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	gormDB, err := gorm.Open(mysql.New(mysql.Config{
		Conn:                      db,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	// 模拟数据库查询结果 - 注意GORM会自动添加软删除条件和LIMIT
	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("camera").
		AddRow("candy").
		AddRow("car").
		AddRow("card").
		AddRow("cat")

	mock.ExpectQuery("SELECT `name` FROM `game_assets`").
		WithArgs("ca%", 5).
		WillReturnRows(rows)

	// 创建服务
	service := newAssetCompletionService(gormDB)
	
	// 测试补全功能
	results, err := service.CompleteAssetName("ca", 5)
	require.NoError(t, err)
	
	expected := []string{"camera", "candy", "car", "card", "cat"}
	assert.Equal(t, expected, results, "Database completion should work")
	
	// 验证所有期望的查询都被调用
	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

// TestAssetCompletionTrie_Basic 基本Trie测试
func TestAssetCompletionTrie_Basic(t *testing.T) {
	// 创建 mock 数据库用于初始化
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	gormDB, err := gorm.Open(mysql.New(mysql.Config{
		Conn:                      db,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	// 模拟初始化时的数据加载
	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("cat").
		AddRow("car").
		AddRow("card").
		AddRow("camera").
		AddRow("candy").
		AddRow("dog").
		AddRow("dragon")

	mock.ExpectQuery("SELECT `name` FROM `game_assets`").
		WillReturnRows(rows)

	// 创建 Trie
	trie := NewAssetCompletionTrie(gormDB)
	
	// 等待初始化完成
	time.Sleep(100 * time.Millisecond)
	
	// 测试前缀补全
	results, err := trie.CompleteAssetName("ca", 5)
	require.NoError(t, err)
	assert.Len(t, results, 5, "Should return 5 results")
	assert.Contains(t, results, "cat")
	assert.Contains(t, results, "car")
	assert.Contains(t, results, "camera")
	
	// 测试大小写不敏感
	results2, err := trie.CompleteAssetName("CA", 3)
	require.NoError(t, err)
	assert.Len(t, results2, 3)
	
	// 验证期望
	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

// TestController_Integration 控制器集成测试
func TestController_Integration(t *testing.T) {
	// 创建 mock 数据库
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	gormDB, err := gorm.Open(mysql.New(mysql.Config{
		Conn:                      db,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	// 模拟查询
	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("ball").
		AddRow("balloon").
		AddRow("book")

	mock.ExpectQuery("SELECT `name` FROM `game_assets`").
		WithArgs("b%", 3).
		WillReturnRows(rows)

	// 创建控制器
	controller := &Controller{
		assetCompletion: newAssetCompletionService(gormDB),
	}

	// 测试控制器方法
	ctx := context.Background()
	results, err := controller.CompleteGameAssetName(ctx, "b", 3)
	
	require.NoError(t, err)
	expected := []string{"ball", "balloon", "book"}
	assert.Equal(t, expected, results)
	
	// 验证期望
	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

// TestAssetCompletionService_EdgeCases 边界条件测试
func TestAssetCompletionService_EdgeCases(t *testing.T) {
	// 创建 mock 数据库
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	gormDB, err := gorm.Open(mysql.New(mysql.Config{
		Conn:                      db,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	service := newAssetCompletionService(gormDB)

	tests := []struct {
		name         string
		prefix       string
		limit        int
		mockRows     *sqlmock.Rows
		expectedLen  int
		expectError  bool
	}{
		{
			name:        "Empty prefix",
			prefix:      "",
			limit:       5,
			mockRows:    sqlmock.NewRows([]string{"name"}).AddRow("cat").AddRow("dog"),
			expectedLen: 2,
			expectError: false,
		},
		{
			name:        "No matches",
			prefix:      "xyz",
			limit:       5,
			mockRows:    sqlmock.NewRows([]string{"name"}),
			expectedLen: 0,
			expectError: false,
		},
		{
			name:        "Zero limit (should default to 5)",
			prefix:      "ca",
			limit:       0,
			mockRows:    sqlmock.NewRows([]string{"name"}).AddRow("cat"),
			expectedLen: 1,
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expectedLimit := tt.limit
			if expectedLimit <= 0 {
				expectedLimit = 5 // 服务默认值
			}
			
			mock.ExpectQuery("SELECT `name` FROM `game_assets`").
				WithArgs(tt.prefix + "%", expectedLimit).
				WillReturnRows(tt.mockRows)

			results, err := service.CompleteAssetName(tt.prefix, tt.limit)
			
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Len(t, results, tt.expectedLen)
			}
		})
	}
}