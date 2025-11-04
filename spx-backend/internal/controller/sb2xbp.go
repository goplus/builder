package controller

import (
	"context"
	"encoding/base64"

	gotypes "go/types"

	"github.com/goplus/sb2xbp/convert"
	"github.com/goplus/sb2xbp/sbio"
	"github.com/goplus/sb2xbp/sbio/ast"
	"github.com/goplus/sb2xbp/sbtypinf"
	"github.com/goplus/sb2xbp/types"
	"github.com/goplus/sb2xbp/xbpio"
)

// Sb2xbpParams defines the parameters for the Scratch to XBP conversion.
type Sb2xbpParams struct {
	File    File              `json:"file"`
	Mapping map[string]string `json:"mapping"`
}

type File struct {
	Data    string `json:"data"` // Base64 encoded file data
	Version int    `json:"version"`
}

type XBPResult struct {
	File File `json:"file"`
}

func (p *Sb2xbpParams) Validate() (ok bool, msg string) {
	if p.File.Data == "" {
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

// Convert converts a file from Scratch format to XBP format.
func (ctrl *Controller) Convert(ctx context.Context, params *Sb2xbpParams) (result *XBPResult, err error) {
	// Decode base64 input data
	inputData, err := base64.StdEncoding.DecodeString(params.File.Data)
	if err != nil {
		return nil, err
	}

	g, err := sbio.OpenFromBytes(inputData, params.File.Version)
	if err != nil {
		return nil, err
	}

	variantType := types.Variant
	variantSlice := types.List
	info := &sbtypinf.TypeInfo{
		VarDefs:  make(map[sbio.Variable]gotypes.Type),
		ListDefs: make(map[sbio.List]gotypes.Type),
		FuncDefs: make(map[ast.Def]*gotypes.Signature),
	}
	err = sbtypinf.Do("main", g, &sbtypinf.Config{
		TyValue: variantType,
		TyList:  variantSlice,
	}, info)
	if err != nil {
		return nil, err
	}

	w := xbpio.New(xbpio.Config{
		Run: xbpio.RunConfig{
			Width:  480,
			Height: 360,
		},
	})
	err = convert.Convert(g, w, convert.Config{
		Query: info,
		NameConv: func(s string) string {
			to, ok := params.Mapping[s]
			if ok {
				return to
			}
			return s
		},
	})
	if err != nil {
		return nil, err
	}

	xbpdata, err := w.Bytes()
	if err != nil {
		return nil, err
	}

	// Encode output data to base64
	outputData := base64.StdEncoding.EncodeToString(xbpdata)

	return &XBPResult{File: File{
		Data:    outputData,
		Version: 1,
	}}, nil
}
