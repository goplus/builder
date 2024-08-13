package model

import (
	"context"
	"errors"
	"testing"

	"github.com/milvus-io/milvus-sdk-go/v2/entity"
	"github.com/stretchr/testify/assert"
)

// MockClient is a manual mock of the client.Client interface
type MockClient struct{}

func (m *MockClient) LoadCollection(ctx context.Context, collectionName string, async bool) error {
	// Simulate a successful LoadCollection operation
	return nil
}

func (m *MockClient) Search(ctx context.Context, collectionName string, partitionNames []string, expr string, outputFields []string, vectors []entity.Vector, vectorField string, metricType entity.MetricType, topK int, searchParams entity.SearchParam) ([]entity.SearchResult, error) {
	// Simulate a successful search operation with one result
	column := &entity.ColumnVarChar{Data: []string{"asset1"}}
	result := entity.SearchResult{Fields: []entity.Column{column}}
	return []entity.SearchResult{result}, nil
}

// TestSearchByVector tests the SearchByVector function
func TestSearchByVector(t *testing.T) {
	ctx := context.TODO()
	mockCli := &MockClient{}

	collectionName := "test_collection"
	searchVector := []float32{0.1, 0.2, 0.3}

	assetIDs, err := SearchByVector(ctx, mockCli, collectionName, searchVector)
	assert.NoError(t, err)
	assert.Equal(t, []string{"asset1"}, assetIDs)
}

// MockClientWithLoadError is a mock client that simulates a LoadCollection failure
type MockClientWithLoadError struct{}

func (m *MockClientWithLoadError) LoadCollection(ctx context.Context, collectionName string, async bool) error {
	return errors.New("failed to load collection")
}

func (m *MockClientWithLoadError) Search(ctx context.Context, collectionName string, partitionNames []string, expr string, outputFields []string, vectors []entity.Vector, vectorField string, metricType entity.MetricType, topK int, searchParams entity.SearchParam) ([]entity.SearchResult, error) {
	// This method should not be called in this test
	return nil, nil
}

// TestSearchByVector_LoadCollectionError tests the error case when LoadCollection fails
func TestSearchByVector_LoadCollectionError(t *testing.T) {
	ctx := context.TODO()
	mockCli := &MockClientWithLoadError{}

	collectionName := "test_collection"
	searchVector := []float32{0.1, 0.2, 0.3}

	assetIDs, err := SearchByVector(ctx, mockCli, collectionName, searchVector)
	assert.Error(t, err)
	assert.Nil(t, assetIDs)
}

// MockClientWithSearchError is a mock client that simulates a Search failure
type MockClientWithSearchError struct{}

func (m *MockClientWithSearchError) LoadCollection(ctx context.Context, collectionName string, async bool) error {
	return nil
}

func (m *MockClientWithSearchError) Search(ctx context.Context, collectionName string, partitionNames []string, expr string, outputFields []string, vectors []entity.Vector, vectorField string, metricType entity.MetricType, topK int, searchParams entity.SearchParam) ([]entity.SearchResult, error) {
	return nil, errors.New("failed to search")
}

// TestSearchByVector_SearchError tests the error case when Search fails
func TestSearchByVector_SearchError(t *testing.T) {
	ctx := context.TODO()
	mockCli := &MockClientWithSearchError{}

	collectionName := "test_collection"
	searchVector := []float32{0.1, 0.2, 0.3}

	assetIDs, err := SearchByVector(ctx, mockCli, collectionName, searchVector)
	assert.Error(t, err)
	assert.Nil(t, assetIDs)
}
