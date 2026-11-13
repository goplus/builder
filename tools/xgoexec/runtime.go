package xgoexec

import (
	"context"
	"fmt"
	"sync"

	"github.com/goplus/ixgo"
	"github.com/goplus/ixgo/xgobuild"
)

type RuntimeHooks struct {
	Error func(phase, message string)
	Exit  func(reason string)
}
type Runtime struct {
	sync.Mutex
	ctx        *ixgo.Context
	interp     *ixgo.Interp
	running    bool
	frameworks map[string]Framework
	hooks      RuntimeHooks
}

func NewRuntime(frameworks map[string]Framework, hooks RuntimeHooks) *Runtime {
	return &Runtime{frameworks: frameworks, hooks: hooks}
}
func (p *Runtime) Configure(name string) error {
	p.Lock()
	defer p.Unlock()
	if p.ctx != nil {
		return fmt.Errorf("already configured")
	}
	if name != "" {
		framework, ok := p.frameworks[name]
		if !ok {
			return fmt.Errorf("unknown framework: %s", name)
		}
		if err := framework.Register(); err != nil {
			return err
		}
	}
	ctx := ixgo.NewContext(ixgo.SupportMultipleInterp | xgobuild.StaticLoad)
	ctx.SetPanic(func(info *ixgo.PanicInfo) { p.hooks.Error("runtime", info.Error.Error()) })
	for _, path := range StandardPackages {
		if _, err := ctx.Loader.Import(path); err != nil {
			return fmt.Errorf("import standard package %q: %w", path, err)
		}
	}
	p.ctx = ctx
	return nil
}
func (p *Runtime) Build(files map[string][]byte) error {
	p.Lock()
	defer p.Unlock()
	if p.ctx == nil {
		return fmt.Errorf("not configured")
	}
	if p.running {
		return fmt.Errorf("executor is running")
	}
	source, err := xgobuild.BuildFSDir(p.ctx, MapFS(files), ".")
	if err != nil {
		return err
	}
	pkg, err := p.ctx.LoadFile("main.go", source)
	if err != nil {
		return err
	}
	interp, err := p.ctx.NewInterp(pkg)
	if err != nil {
		return err
	}
	p.interp = interp
	return nil
}
func (p *Runtime) Run() error {
	p.Lock()
	if p.ctx == nil || p.interp == nil {
		p.Unlock()
		return fmt.Errorf("not built")
	}
	if p.running {
		p.Unlock()
		return fmt.Errorf("executor is running")
	}
	ctx, interp := p.ctx, p.interp
	runCtx := context.Background()
	setCurrentRunContext(runCtx)
	p.running = true
	p.Unlock()
	go func() {
		ctx.RunContext = runCtx
		_, err := ctx.RunInterp(interp, "main.go", nil)
		reason := "completed"
		if err != nil {
			reason = "error"
			p.hooks.Error("runtime", err.Error())
		}
		p.Lock()
		p.running = false
		p.Unlock()
		p.hooks.Exit(reason)
	}()
	return nil
}
