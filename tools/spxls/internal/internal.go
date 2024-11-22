package internal

import (
	"github.com/goplus/mod/gopmod"
	_ "github.com/goplus/spx"
)

func init() {
	gopmod.SpxProject.Works = []*gopmod.Class{{Ext: ".spx", Class: "SpriteImpl"}}
}
