package main

import (
	"context"
	"github.com/milvus-io/milvus-sdk-go/v2/client"
	"github.com/milvus-io/milvus-sdk-go/v2/entity"
	"log"
)

func NewCollection() {
	// connect to  milvus
	ctx := context.Background()
	cli, err := client.NewGrpcClient(ctx, "localhost:19530")
	if err != nil {
		log.Fatalf("Failed to connect to Milvus: %v", err)
	}
	defer cli.Close()

	// define fields
	idField := &entity.Field{
		Name:       "id",
		DataType:   entity.FieldTypeInt64,
		PrimaryKey: true,
		AutoID:     true,
	}

	vectorField := &entity.Field{
		Name:     "vector",
		DataType: entity.FieldTypeFloatVector,
		TypeParams: map[string]string{
			"dim": "384",
		},
		//IndexParams: map[string]string{
		//	"metric_type": "L2",
		//},
	}

	assetIDField := &entity.Field{
		Name:     "asset_id",
		DataType: entity.FieldTypeVarChar,
		TypeParams: map[string]string{
			"max_length": "10",
		},
	}

	assetNameField := &entity.Field{
		Name:     "asset_name",
		DataType: entity.FieldTypeVarChar,
		TypeParams: map[string]string{
			"max_length": "255",
		},
	}

	// define collection schema
	schema := &entity.Schema{
		CollectionName: "asset",
		Fields:         []*entity.Field{idField, vectorField, assetIDField, assetNameField},
	}

	// create collection
	err = cli.CreateCollection(ctx, schema, 1)
	if err != nil {
		log.Fatalf("Failed to create collection: %v", err)
	}

	idx, err := entity.NewIndexIvfFlat(entity.L2, 2)
	if err != nil {
		log.Fatal("fail to create ivf flat index:", err.Error())
	}
	cli.CreateIndex(ctx, "asset", "vector", idx, false)
}

func main() {
	NewCollection()
}
