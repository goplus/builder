package controller

import (
	"context"

	"github.com/goplus/builder/spx-backend/internal/sb2xbp"
)

// Sb2xbpParams defines the parameters for the Scratch to XBP conversion.
type Sb2xbpParams struct {
	File    File              `json:"file"`
	Mapping map[string]string `json:"mapping"`
}

type File struct {
	Data    []byte `json:"data"`
	Version int    `json:"version"`
}

type XBPResult struct {
	File File `json:"file"`
}

func (p *Sb2xbpParams) Validate() (ok bool, msg string) {
	if p.File.Data == nil {
		return false, "file data is required"
	}
	if p.File.Version != 2 && p.File.Version != 3 {
		return false, "file version is invalid"
	}
	if p.Mapping == nil {
		p.Mapping = make(map[string]string)
	}
	return true, ""
}

// ConvertXBP converts a file from Scratch format to XBP format.
func (ctrl *Controller) Convert(ctx context.Context, params *Sb2xbpParams) (result *XBPResult, err error) {
	data, err := sb2xbp.Convert(params.File.Data, params.File.Version, params.Mapping)
	if err != nil {
		return nil, err
	}

	return &XBPResult{File: File{
		Data:    data,
		Version: 1,
	}}, nil
}
