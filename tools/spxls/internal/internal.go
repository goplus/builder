package internal

import "github.com/goplus/mod/gopmod"

func init() {
	gopmod.SpxProject.Works = []*gopmod.Class{{Ext: ".spx", Class: "SpriteImpl"}}
}
