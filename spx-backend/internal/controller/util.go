package controller

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"time"

	"github.com/goplus/builder/spx-backend/internal/fmtcode"
	"github.com/goplus/builder/spx-backend/internal/log"
	qiniuStorage "github.com/qiniu/go-sdk/v7/storage"
)

// FmtCodeParams holds parameters for formatting code.
type FmtCodeParams struct {
	Body       string `json:"body"`
	FixImports bool   `json:"fixImports"`
}

// Validate validates the parameters.
func (p *FmtCodeParams) Validate() (ok bool, msg string) {
	if p.Body == "" {
		return false, "missing body"
	}
	return true, ""
}

// FormattedCode holds the formatted code.
type FormattedCode struct {
	Body  string               `json:"body"`
	Error *fmtcode.FormatError `json:"error,omitempty"`
}

// FmtCode formats the code.
func (ctrl *Controller) FmtCode(ctx context.Context, params *FmtCodeParams) (*FormattedCode, error) {
	logger := log.GetReqLogger(ctx)
	formattedBody, err := fmtcode.FmtCode(ctx, params.Body, params.FixImports)
	if err != nil {
		var fmtErr *fmtcode.FormatError
		if ok := errors.As(err, &fmtErr); ok {
			return &FormattedCode{Error: fmtErr}, nil
		}
		logger.Printf("failed to format code: %v", err)
		return nil, err
	}
	return &FormattedCode{Body: formattedBody}, nil
}

// UpInfo holds the information for uploading files.
type UpInfo struct {
	// Token is the upload token.
	Token string `json:"token"`

	// Expires is the token expiration time in seconds.
	Expires uint64 `json:"expires"`

	// MaxSize is the maximum allowed file size in bytes.
	MaxSize int64 `json:"maxSize"`

	// Bucket is the name of the bucket.
	Bucket string `json:"bucket"`

	// Region is the region of the bucket.
	Region string `json:"region"`
}

// GetUpInfo gets the information for uploading files.
func (ctrl *Controller) GetUpInfo(ctx context.Context) (*UpInfo, error) {
	putPolicy := qiniuStorage.PutPolicy{
		Scope:        ctrl.kodo.bucket,
		Expires:      1800, // 30 minutes in seconds
		ForceSaveKey: true,
		SaveKey:      "files/$(etag)-$(fsize)",

		// The hardcoded size limit here should be sufficient for most
		// frontend use cases. If needed, we can make it configurable in
		// the future.
		FsizeLimit: 25 << 20, // 25 MiB
	}
	upToken := putPolicy.UploadToken(ctrl.kodo.cred)
	return &UpInfo{
		Token:   upToken,
		Expires: putPolicy.Expires,
		MaxSize: putPolicy.FsizeLimit,
		Bucket:  ctrl.kodo.bucket,
		Region:  ctrl.kodo.bucketRegion,
	}, nil
}

// MakeFileURLsParams holds parameters for making file URLs.
type MakeFileURLsParams struct {
	// Objects is a list of universal URLs of the objects.
	Objects []string `json:"objects"`
}

// Validate validates the parameters.
func (p *MakeFileURLsParams) Validate() (ok bool, msg string) {
	return true, ""
}

// FileURLs holds the signed web URLs for the files.
type FileURLs struct {
	// ObjectURLs is a map from universal URLs to signed web URLs for the objects.
	ObjectURLs map[string]string `json:"objectUrls"`
}

// MakeFileURLs makes signed web URLs for the files.
func (ctrl *Controller) MakeFileURLs(ctx context.Context, params *MakeFileURLsParams) (*FileURLs, error) {
	const expires = 25 * 3600 // 25 hours in seconds
	logger := log.GetReqLogger(ctx)
	fileURLs := &FileURLs{
		ObjectURLs: make(map[string]string, len(params.Objects)),
	}
	for _, object := range params.Objects {
		u, err := url.Parse(object)
		if err != nil {
			logger.Printf("invalid object: %s: %v", object, err)
			return nil, err
		}
		if u.Scheme != "kodo" || u.Host != ctrl.kodo.bucket {
			err := fmt.Errorf("unrecognized object: %s", object)
			logger.Printf("%v", err)
			return nil, err
		}

		objectURL, err := url.JoinPath(ctrl.kodo.baseUrl, u.Path)
		if err != nil {
			logger.Printf("url.JoinPath failed: [%q, %q]: %v", ctrl.kodo.baseUrl, object, err)
			return nil, err
		}

		// INFO: Workaround for browser caching issue with signed URLs, causing redundant downloads.
		now := time.Now().UTC()
		e := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).Unix() + expires

		objectURL += fmt.Sprintf("?e=%d", e)
		objectURL += "&token=" + ctrl.kodo.cred.Sign([]byte(objectURL))
		fileURLs.ObjectURLs[object] = objectURL
	}
	return fileURLs, nil
}
