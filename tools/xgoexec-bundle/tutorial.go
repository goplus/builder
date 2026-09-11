package main

import (
	"github.com/goplus/ixgo/xgobuild"
	"github.com/goplus/mod/modfile"
)

const tutorialFrameworkName = "tutorial"

type tutorialFramework struct{}

func (tutorialFramework) Register() error {
	// TODO: Load this project configuration from tools/tutorial/gox.mod.
	xgobuild.RegisterProject(&modfile.Project{
		Ext:      "_course.gox",
		Class:    "Course",
		PkgPaths: []string{"github.com/goplus/builder/tools/tutorial"},
	})
	return nil
}
