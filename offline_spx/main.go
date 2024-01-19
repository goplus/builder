package main

//go:generate qexp -outdir pkg github.com/goplus/spx

import (
	"flag"
	"fmt"
	"github.com/goplus/igop"
	"github.com/goplus/igop/gopbuild"
	_ "github.com/goplus/igop/pkg/fmt"
	_ "github.com/goplus/igop/pkg/math"
	"github.com/goplus/builder/offline_spx/ifs"
	_ "github.com/goplus/builder/offline_spx/pkg/github.com/goplus/spx"
	_ "github.com/goplus/reflectx/icall/icall8192"
	"github.com/goplus/spx"
	"log"
	"os"
	"syscall/js"
)

var (
	flagDumpSrc bool
	flagTrace   bool
	flagDumpSSA bool
	flagDumpPKG bool
	flagVerbose bool
)

func init() {
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "ispc [flags] dir\n")
		flag.PrintDefaults()
	}
	flag.BoolVar(&flagDumpSrc, "dumpsrc", false, "print source code")
	flag.BoolVar(&flagDumpSSA, "dumpssa", false, "print ssa code information")
	flag.BoolVar(&flagDumpPKG, "dumppkg", false, "print import pkgs")
	flag.BoolVar(&flagTrace, "trace", false, "trace")
	flag.BoolVar(&flagVerbose, "v", false, "print verbose information")
}

func main() {
	flagVerbose = true
	global := js.Global().Get("top")
	path := global.Get("project_path").String()
	if flagVerbose {
		log.Println("load url", path)
	}
	var mode igop.Mode
	if flagDumpSSA {
		mode |= igop.EnableDumpInstr
	}
	if flagTrace {
		mode |= igop.EnableTracing
	}
	if flagDumpPKG {
		mode |= igop.EnableDumpImports
	}
	ctx := igop.NewContext(mode)
	var (
		data []byte
		err  error
	)
	fs := ifs.NewIndexedDBFileSystem()
	if flagVerbose {
		log.Println("BuildDir", path)
	}
	data, err = gopbuild.BuildFSDir(ctx, fs, path)
	if err != nil {
		log.Panicln(err)
	}
	log.Println("buildFSdir success")

	igop.RegisterExternal("github.com/goplus/spx.Gopt_Game_Run", func(game spx.Gamer, resource interface{}, gameConf ...*spx.Config) {
		asset := path + "/" + resource.(string)
		fs := ifs.NewIndexedDBDir(asset)
		if err != nil {
			log.Panicln(err)
		}
		spx.Gopt_Game_Run(game, fs, gameConf...)
	})

	if flagDumpSrc {
		fmt.Println(string(data))
	}

	//log.Println("source code is: %s", string(data))

	_, err = ctx.RunFile("main.go", data, nil)
	if err != nil {
		log.Panicln(err)
	}
}
