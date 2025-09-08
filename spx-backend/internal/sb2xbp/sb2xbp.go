package sb2xbp

import (
	gotypes "go/types"

	"github.com/goplus/sb2xbp/convert"
	"github.com/goplus/sb2xbp/sbio"
	"github.com/goplus/sb2xbp/sbio/ast"
	"github.com/goplus/sb2xbp/sbtypinf"
	"github.com/goplus/sb2xbp/types"
	"github.com/goplus/sb2xbp/xbpio"
)

func Convert(data []byte, ver int, mapping map[string]string) ([]byte, error) {
	g, err := sbio.OpenFromBytes(data, ver)
	if err != nil {
		return nil, err
	}

	varentType := types.Variant
	varentSlice := types.List
	info := &sbtypinf.TypeInfo{
		VarDefs:  make(map[sbio.Variable]gotypes.Type),
		ListDefs: make(map[sbio.List]gotypes.Type),
		FuncDefs: make(map[ast.Def]*gotypes.Signature),
	}
	err = sbtypinf.Do("main", g, &sbtypinf.Config{
		TyValue: varentType,
		TyList:  varentSlice,
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
			to, ok := mapping[s]
			if ok {
				return to
			}
			return s
		},
	})

	xbpdata, err := w.Bytes()
	if err != nil {
		return nil, err
	}

	return xbpdata, nil
}
