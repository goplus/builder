// This script is used to load all assets to Milvus. 
//
// The script reads the assets from the database 
// and then calls the AIGC service to get the embeddings of the assets 
// and inserts them into the Milvus database. 
package main

import (
	"context"
	"database/sql"
	"errors"
	_ "image/png"
	"net/http"
	"io/fs"
	"os"
	
	_ "github.com/go-sql-driver/mysql"
	"github.com/goplus/builder/spx-backend/internal/aigc"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/joho/godotenv"
	milvus "github.com/milvus-io/milvus-sdk-go/v2/client"
	_ "github.com/qiniu/go-cdk-driver/kodoblob"
	qiniuLog "github.com/qiniu/x/log"

	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/controller"
)

var (
	ErrNotExist     = errors.New("not exist")
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")
)

func Load() (err error) {
	logger := log.GetLogger()
	ctx := context.Background()

	if err := godotenv.Load(); err != nil && !errors.Is(err, fs.ErrNotExist) {
		logger.Printf("failed to load env: %v", err)
		return err
	}

	dsn := mustEnv(logger, "GOP_SPX_DSN")
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		logger.Printf("failed to connect sql: %v", err)
		return err
	}

	aigcClient := aigc.NewAigcClient(mustEnv(logger, "AIGC_ENDPOINT"))

	var milvusClient milvus.Client
	if os.Getenv("ENV") != "test" && os.Getenv("MILVUS_ADDRESS") != "disabled" {
		milvusClient, err = milvus.NewClient(ctx, milvus.Config{
			Address: os.Getenv("MILVUS_ADDRESS"),
		})
		if err != nil {
			logger.Printf("failed to create milvus client: %v,%v", err, os.Getenv("MILVUS_ADDRESS"))
			return err
		}
	}

	// load all assets from the database
	assets, err := LoadAssets(ctx, db)
	if err != nil {
		logger.Printf("Failed to load assets: %v", err)
		return err
	}

	// for each asset, call embedding service to get the embedding
	for i, asset := range assets {
		logger.Printf("Processing asset %d/%d: %s", i+1, len(assets), asset.DisplayName)

		// check if the asset id is already in the milvus
		if model.ExistsMilvusAsset(ctx, milvusClient, asset.ID) {
			logger.Printf("Asset %s already exists in Milvus", asset.DisplayName)
			continue
		}
		
		var embeddingResult controller.GetEmbeddingResult
		err = aigcClient.Call(ctx, http.MethodPost, "/embedding", &controller.GetEmbeddingParams{
			Prompt: asset.DisplayName,
			CallbackUrl: "",
		}, &embeddingResult)

		if err != nil {
			logger.Printf("failed to call: %v", err)
			return err
		}

		// insert the embedding into the milvus
		model.AddMilvusAsset(ctx, milvusClient, &model.MilvusAsset{
			AssetID: asset.ID,
			AssetName: asset.DisplayName,
			Vector: embeddingResult.Embedding,
		})
	}

	return nil
}

// LoadAssets loads all assets from the database.
func LoadAssets(ctx context.Context, db *sql.DB) ([]model.Asset, error) {
	logger := log.GetReqLogger(ctx)

	assets, err := model.ListAssets(ctx, db, model.Pagination{
		Index: 1,
		Size:  65535,
	}, nil, nil, nil)
	if err != nil {
		logger.Printf("ListAssets failed: %v", err)
		return nil, err
	}
	return assets.Data, nil
}

// mustEnv gets the environment variable value or exits the program.
func mustEnv(logger *qiniuLog.Logger, key string) string {
	value := os.Getenv(key)
	if value == "" {
		logger.Fatalf("Missing required environment variable: %s", key)
	}
	return value
}

func main() {
	if err := Load(); err != nil {
		os.Exit(1)
	}
}