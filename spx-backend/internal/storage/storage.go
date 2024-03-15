package storage

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"time"

	"gocloud.dev/blob"

	"golang.org/x/crypto/scrypt"
)

// UploadFile Upload file to cloud
func UploadFile(ctx context.Context, bucket Bucket, blobKey string, file io.Reader, originalFilename string) (string, error) {
	// Extract file extension
	ext := filepath.Ext(originalFilename)

	var contentType string
	if ext == ".svg" {
		contentType = "image/svg+xml"
	}
	// Create blob writer with content type
	wOpts := &blob.WriterOptions{
		ContentType: contentType,
	}
	//File name encryption
	blobKey = blobKey + Encrypt(time.Now().String(), originalFilename) + ext

	// create blob writer
	w, err := bucket.NewWriter(ctx, blobKey, wOpts)
	if err != nil {
		fmt.Printf("failed to create blob writer : %v", err)
		return "", err
	}
	defer w.Close()

	// copy to blob writer
	_, err = io.Copy(w, file)
	if err != nil {
		fmt.Printf("failed to copy to blob writer : %v", err)
		return "", err
	}

	// close writer file
	return blobKey, w.Close()
}

func Encrypt(salt, password string) string {
	dk, _ := scrypt.Key([]byte(password), []byte(salt), 32768, 8, 1, 32)
	return fmt.Sprintf("%x", string(dk))
}
