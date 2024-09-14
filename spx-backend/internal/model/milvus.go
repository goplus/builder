package model

import (
	"context"

	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/milvus-io/milvus-sdk-go/v2/client"
	"github.com/milvus-io/milvus-sdk-go/v2/entity"
)

type MilvusAsset struct {
	ID        int       `db:"id" json:"id"`
	Vector    []float32 `db:"vector" json:"vector"`
	AssetID   string    `db:"asset_id" json:"asset_id"`
	AssetName string    `db:"asset_name" json:"asset_name"`
}

// SearchByVector searches for vectors in a collection that are similar to the given search vector.
func SearchByVector(ctx context.Context, cli client.Client, collectionName string, searchVector []float32, topK int) ([]string, error) {
	logger := log.GetReqLogger(ctx)

	if cli == nil || collectionName == "" || len(searchVector) == 0 || topK <= 0 {
		logger.Printf("Invalid input: %v, %v, %v, %v", cli, collectionName, searchVector, topK)
		return nil, nil
	}
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
		[]string{"asset_name"},

		[]entity.Vector{entity.FloatVector(searchVector)},

		// Vector field name
		"vector",

		// distance metric type
		entity.L2,

		//Maximum number returned by search
		topK,

		searchParams,
	)
	if err != nil {
		logger.Printf("Failed to search: %v", err)
		return nil, err
	}

	var assetNames []string
	// If no search results are returned, return an empty list
	if len(results) == 0 || len(results[0].Fields) == 0 {
		return assetNames, nil
	}
	//Process search results
	for _, result := range results {
		f := result.Fields[0].(*entity.ColumnVarChar)
		assetNames = append(assetNames, f.Data()...)
	}

	return assetNames, nil
}

// Add an asset
func AddMilvusAsset(ctx context.Context, cli client.Client, asset *MilvusAsset) error {
    logger := log.GetReqLogger(ctx)

    if cli == nil || asset == nil {
        logger.Printf("Invalid input: %v, %v", cli, asset)
        return nil
    }

    vector := asset.Vector

    columns := []entity.Column{
        entity.NewColumnFloatVector("vector", 384, [][]float32{vector}),
		entity.NewColumnVarChar("asset_id", []string{asset.AssetID}),
		entity.NewColumnVarChar("asset_name", []string{asset.AssetName}),
    }

    _, err := cli.Insert(ctx, "asset", "", columns...)
    if err != nil {
        logger.Printf("Failed to insert data: %v", err)
        return err
    }

    err = cli.Flush(ctx, "asset", false)
    if err != nil {
        logger.Printf("Failed to flush data: %v", err)
        return err
    }

    return nil
}