package model

import (
	"context"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/milvus-io/milvus-sdk-go/v2/client"
	"github.com/milvus-io/milvus-sdk-go/v2/entity"
)

func SearchByVector(ctx context.Context, cli client.Client, collectionName string, searchVector []float32) ([]string, error) {
	logger := log.GetReqLogger(ctx)

	// Load collection
	err := cli.LoadCollection(ctx, collectionName, false)
	if err != nil {
		logger.Printf("Failed to load collection: %v", err)
		return nil, err
	}

	// Perform a search
	searchParams, err := entity.NewIndexFlatSearchParam()
	if err != nil {
		logger.Printf("Failed to choose search param: %v", err)
		return nil, err
	}
	results, err := cli.Search(
		ctx,

		// collectionName
		collectionName,

		// A list of partition names. If no partition is specified, an empty slice can be passed.
		[]string{},

		// Search conditions, if there is no condition, you can pass an empty string
		"",

		// Result field
		[]string{"asset_id"},

		[]entity.Vector{entity.FloatVector(searchVector)},

		// Vector field name
		"vector",

		// distance metric type
		entity.L2,

		//Maximum number returned by search
		100,

		searchParams,
	)
	if err != nil {
		logger.Printf("Failed to search: %v", err)
		return nil, err
	}

	var assetIDs []string

	//Process search results
	for _, result := range results {
		f := result.Fields[0].(*entity.ColumnVarChar)
		assetIDs = append(assetIDs, f.Data()[0])
	}

	return assetIDs, nil
}
