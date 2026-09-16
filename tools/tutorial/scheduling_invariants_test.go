package tutorial

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"path/filepath"
	"strings"
	"testing"
)

// 本文件把调度器的持锁纪律从注释升级为机器检查。被守护的规则：
//
//  1. 执行令牌（execToken）只经 acquireExec/releaseExec 流转，且只有 runFrame 与
//     yieldWhile 有资格调它们——运行只有一个让出点，不存在散落在别处的临时让位。
//  2. yieldWhile 只从 mustCallCapability（等宿主）与 join（OneAtATime 排队）进入；
//     桥的 callCapability 只出现在 mustCallCapability 里。
//  3. schedulerMu 的持锁区间内没有任何可能阻塞的操作（channel 收发、select、Wait、
//     取令牌、调桥）；registryMu 与 groupMu 是叶子锁，持锁区间只允许白名单里的调用。
//  4. 运行的生命周期入口唯一：startRuns 只由 Start（与包级的事件投递闭包）调用；
//     admitRun 只在 startRuns 与 goLive；cancel 只在 join；markYielded 只在 runFrame
//     与 yieldWhile。
//  5. 事件入口只有一个：向执行器注册 handler 只发生在 init；events.attach 只在
//     XGot_Course_Main、events.goLive 只在 Start 里调用。
//
// 检查基于 AST 而不是运行观察：违规的“写法”在进入仓库时就变红，
// 不依赖测试恰好踩中那条时序。
func TestSchedulingInvariants(t *testing.T) {
	fset := token.NewFileSet()
	files, err := filepath.Glob("*.go")
	if err != nil {
		t.Fatal(err)
	}

	for _, file := range files {
		if strings.HasSuffix(file, "_test.go") {
			continue
		}
		parsed, err := parser.ParseFile(fset, file, nil, 0)
		if err != nil {
			t.Fatal(err)
		}
		for _, decl := range parsed.Decls {
			fn, ok := decl.(*ast.FuncDecl)
			if !ok || fn.Body == nil {
				continue
			}
			checkFunction(t, fset, fn)
		}
	}
}

// 各规则的豁免名单：唯一有资格出现这些操作的函数。
var (
	tokenOperators   = map[string]bool{"runFrame": true, "yieldWhile": true}
	tokenPlumbing    = map[string]bool{"acquireExec": true, "releaseExec": true, "init": true}
	yieldCallers     = map[string]bool{"mustCallCapability": true, "join": true}
	blockingWaitHome = "mustCallCapability"
	admitCallers     = map[string]bool{"startRuns": true, "goLive": true}
	yieldMarkers     = map[string]bool{"runFrame": true, "yieldWhile": true}
)

func checkFunction(t *testing.T, fset *token.FileSet, fn *ast.FuncDecl) {
	name := fn.Name.Name
	report := func(pos token.Pos, format string, args ...any) {
		t.Errorf("%s: %s", fset.Position(pos), fmt.Sprintf(format, args...))
	}

	// 规则 1/2/4：按标识符归属检查调用点资格。
	ast.Inspect(fn.Body, func(node ast.Node) bool {
		switch n := node.(type) {
		case *ast.CallExpr:
			callee := renderExpr(n.Fun)
			switch {
			case strings.HasSuffix(callee, ".acquireExec"), strings.HasSuffix(callee, ".releaseExec"):
				if !tokenOperators[name] {
					report(n.Pos(), "%s calls %s: only runFrame and yieldWhile may operate the token", name, callee)
				}
			case strings.HasSuffix(callee, ".yieldWhile"):
				if !yieldCallers[name] {
					report(n.Pos(), "%s yields the token: only mustCallCapability and join may wait", name)
				}
			case strings.HasSuffix(callee, ".callCapability"):
				if name != blockingWaitHome {
					report(n.Pos(), "%s calls the capability bridge directly: all bridge waits must go through %s", name, blockingWaitHome)
				}
			case callee == "startRuns":
				if name != "Start" {
					report(n.Pos(), "%s starts runs: only Course.Start and the event deliverers may", name)
				}
			case strings.HasSuffix(callee, ".admitRun"):
				if !admitCallers[name] {
					report(n.Pos(), "%s admits a goroutine to runs: only startRuns and goLive may", name)
				}
			case strings.HasSuffix(callee, ".cancel"):
				if name != "join" {
					report(n.Pos(), "%s cancels a run: cancellation is a run group policy, only join may", name)
				}
			case strings.HasSuffix(callee, ".markYielded"):
				if !yieldMarkers[name] {
					report(n.Pos(), "%s marks a run yielded: only runFrame and yieldWhile may", name)
				}
			case strings.HasSuffix(callee, ".RegisterEventHandler"):
				if name != "init" {
					report(n.Pos(), "%s registers an event handler: handlers are registered once, in init", name)
				}
			case callee == "events.attach":
				if name != "XGot_Course_Main" {
					report(n.Pos(), "%s attaches a program to the event registry: only the classfile entry may", name)
				}
			case callee == "events.goLive":
				if name != "Start" {
					report(n.Pos(), "%s switches the event registry live: only Course.Start may", name)
				}
			}
		case *ast.Ident:
			if n.Name == "execToken" && !tokenOperators[name] && !tokenPlumbing[name] {
				report(n.Pos(), "%s references the token directly: use acquireExec/releaseExec", name)
			}
		}
		return true
	})

	// 规则 3：schedulerMu 的持锁区间内不得有阻塞操作；registryMu / groupMu 是叶子锁，
	// 持锁区间内只允许白名单里的调用。
	recv := receiverName(fn)
	for _, guard := range []string{"schedulerMu", "registryMu", "groupMu"} {
		for _, region := range heldRegions(fn, recv, guard) {
			ast.Inspect(fn.Body, func(node ast.Node) bool {
				if node == nil || node.Pos() < region.from || node.Pos() >= region.to {
					return true
				}
				if allowed, leaf := leafLockAllowedCalls[guard]; leaf {
					if n, ok := node.(*ast.CallExpr); ok {
						callee := renderExpr(n.Fun)
						own := callee == recv+"."+guard+".Lock" || callee == recv+"."+guard+".Unlock"
						if !allowed[callee] && !own {
							report(n.Pos(), "%s called inside a %s-held region of %s: this leaf lock only guards field access", callee, guard, name)
						}
					}
					return true
				}
				switch n := node.(type) {
				case *ast.SendStmt:
					report(n.Pos(), "channel send inside a %s-held region of %s", guard, name)
				case *ast.UnaryExpr:
					if n.Op == token.ARROW {
						report(n.Pos(), "channel receive inside a %s-held region of %s", guard, name)
					}
				case *ast.SelectStmt:
					report(n.Pos(), "select inside a %s-held region of %s", guard, name)
				case *ast.CallExpr:
					callee := renderExpr(n.Fun)
					blocking := strings.HasSuffix(callee, ".Wait") ||
						strings.HasSuffix(callee, ".acquireExec") ||
						strings.HasSuffix(callee, ".releaseExec") ||
						strings.HasSuffix(callee, ".yieldWhile") ||
						strings.HasSuffix(callee, ".callCapability") ||
						(strings.HasSuffix(callee, ".Lock") && callee != recv+"."+guard+".Lock") // schedulerMu 是最内层的锁，不嵌套别的锁
					if blocking {
						report(n.Pos(), "%s called inside a %s-held region of %s", callee, guard, name)
					}
				}
				return true
			})
		}
	}
}

// leafLockAllowedCalls 列出各叶子锁持锁区间内唯一允许的调用：都是纯计算、
// 不可能阻塞，也碰不到别的锁。解码、投递、取消与等待必须在锁外。
var leafLockAllowedCalls = map[string]map[string]bool{
	"registryMu": {"len": true, "append": true, "make": true, "fmt.Errorf": true, "json.RawMessage": true},
	"groupMu":    {"len": true, "append": true, "close": true},
}

type lockRegion struct {
	from, to token.Pos
}

// receiverName 返回方法接收者的名字；普通函数（如 deliverAll）按惯例用 p 指代程序。
func receiverName(fn *ast.FuncDecl) string {
	if fn.Recv != nil && len(fn.Recv.List) > 0 && len(fn.Recv.List[0].Names) > 0 {
		return fn.Recv.List[0].Names[0].Name
	}
	return "p"
}

// heldRegions 计算 fn 内 guard（<recv>.<guard>）的持锁区间。
// 两种写法都覆盖：显式 Unlock → [Lock, Unlock)；defer Unlock → [Lock, 函数尾)。
func heldRegions(fn *ast.FuncDecl, recv, guard string) []lockRegion {
	var locks, unlocks []token.Pos
	deferred := false

	ast.Inspect(fn.Body, func(node ast.Node) bool {
		switch n := node.(type) {
		case *ast.DeferStmt:
			if renderExpr(n.Call.Fun) == recv+"."+guard+".Unlock" {
				deferred = true
			}
			return false // defer 里的 Unlock 不算显式解锁点
		case *ast.CallExpr:
			switch renderExpr(n.Fun) {
			case recv + "." + guard + ".Lock":
				locks = append(locks, n.Pos())
			case recv + "." + guard + ".Unlock":
				unlocks = append(unlocks, n.Pos())
			}
		}
		return true
	})

	var regions []lockRegion
	for _, lock := range locks {
		end := fn.Body.End()
		for _, unlock := range unlocks {
			if unlock > lock && unlock < end {
				end = unlock
			}
		}
		if end == fn.Body.End() && !deferred && len(unlocks) > 0 {
			// 所有显式 Unlock 都在 Lock 之前（分支写法）：保守地取函数尾。
			end = fn.Body.End()
		}
		regions = append(regions, lockRegion{from: lock, to: end})
	}
	return regions
}

// renderExpr 把选择器链渲染成 "p.schedulerMu.Lock" 形式的字符串，便于按名匹配。
func renderExpr(expr ast.Expr) string {
	switch n := expr.(type) {
	case *ast.Ident:
		return n.Name
	case *ast.SelectorExpr:
		return renderExpr(n.X) + "." + n.Sel.Name
	default:
		return ""
	}
}
