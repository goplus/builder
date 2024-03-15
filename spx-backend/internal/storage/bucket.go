package storage

import (
	"context"
	"io"

	"gocloud.dev/blob"
)

type Bucket interface {
	NewWriter(context.Context, string, *blob.WriterOptions) (io.WriteCloser, error)
	Delete(ctx context.Context, key string) (err error)
}

type BlobBucket struct {
	b *blob.Bucket
}

func NewBlobBucket(b *blob.Bucket) *BlobBucket {
	return &BlobBucket{b}
}

func (b *BlobBucket) NewWriter(ctx context.Context, key string, opts *blob.WriterOptions) (io.WriteCloser, error) {
	return b.b.NewWriter(ctx, key, opts)
}

func (b *BlobBucket) Delete(ctx context.Context, key string) (err error) {
	return b.b.Delete(ctx, key)
}
