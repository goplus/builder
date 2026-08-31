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
//  1. 执行令牌只经 acquire/release 流转，且只有 runFrame 与 mustCallCapability
//     有资格调它们——不存在散落在别处的临时让位。
//  2. 可能长时间阻塞的等待（presentationMu、桥的 callCapability）只出现在
//     mustCallCapability 里——那里的固定顺序保证等待前已交还令牌。
//  3. mu 与 deliverMu 的持锁区间内没有任何可能阻塞的操作
//     （channel 收发、select、Wait、取令牌、调桥、拿慢锁）。
//  4. deliverMu 只在 deliverAll 里使用——deliverMu→mu 是唯一的嵌套方向。
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
	tokenOperators   = map[string]bool{"runFrame": true, "mustCallCapability": true}
	tokenPlumbing    = map[string]bool{"acquire": true, "release": true, "init": true}
	blockingWaitHome = "mustCallCapability"
	deliverMuHome    = "deliverAll"
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
			case strings.HasSuffix(callee, ".acquire"), strings.HasSuffix(callee, ".release"):
				if !tokenOperators[name] {
					report(n.Pos(), "%s calls %s: only runFrame and mustCallCapability may operate the token", name, callee)
				}
			case strings.Contains(callee, "presentationMu."):
				if name != blockingWaitHome {
					report(n.Pos(), "%s touches presentationMu: waiting on it is only legal in %s, after the token is released", name, blockingWaitHome)
				}
			case strings.HasSuffix(callee, ".callCapability"):
				if name != blockingWaitHome {
					report(n.Pos(), "%s calls the capability bridge directly: all bridge waits must go through %s", name, blockingWaitHome)
				}
			case strings.Contains(callee, "deliverMu."):
				if name != deliverMuHome {
					report(n.Pos(), "%s touches deliverMu: delivery serialization belongs to %s only", name, deliverMuHome)
				}
			}
		case *ast.Ident:
			if n.Name == "token" && !tokenOperators[name] && !tokenPlumbing[name] {
				report(n.Pos(), "%s references the token directly: use acquire/release", name)
			}
		}
		return true
	})

	// 规则 3：mu / deliverMu 的持锁区间内不得有阻塞操作。
	for _, guard := range []string{"mu", "deliverMu"} {
		for _, region := range heldRegions(fn, guard) {
			ast.Inspect(fn.Body, func(node ast.Node) bool {
				if node == nil || node.Pos() < region.from || node.Pos() >= region.to {
					return true
				}
				switch n := node.(type) {
				case *ast.SendStmt:
					// 唯一豁免：deliverAll 在 deliverMu 区间内向 lane.queue 发送。
					// 它可证明不阻塞——同一把 deliverMu 下刚做完全量容量预检，
					// 而队列只有投递方会填充。这正是全有或全无投递的机制本身。
					if guard == "deliverMu" && name == deliverMuHome && renderExpr(n.Chan) == "lane.queue" {
						return true
					}
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
						strings.HasSuffix(callee, ".acquire") ||
						strings.HasSuffix(callee, ".release") ||
						strings.HasSuffix(callee, ".callCapability") ||
						strings.Contains(callee, "presentationMu.Lock")
					if guard == "mu" && strings.Contains(callee, "deliverMu.Lock") {
						blocking = true // 嵌套方向只允许 deliverMu→mu
					}
					if blocking {
						report(n.Pos(), "%s called inside a %s-held region of %s", callee, guard, name)
					}
				}
				return true
			})
		}
	}
}

type lockRegion struct {
	from, to token.Pos
}

// heldRegions 计算 fn 内 guard（p.<guard>）的持锁区间。
// 两种写法都覆盖：显式 Unlock → [Lock, Unlock)；defer Unlock → [Lock, 函数尾)。
func heldRegions(fn *ast.FuncDecl, guard string) []lockRegion {
	var locks, unlocks []token.Pos
	deferred := false

	ast.Inspect(fn.Body, func(node ast.Node) bool {
		switch n := node.(type) {
		case *ast.DeferStmt:
			if renderExpr(n.Call.Fun) == "p."+guard+".Unlock" {
				deferred = true
			}
			return false // defer 里的 Unlock 不算显式解锁点
		case *ast.CallExpr:
			switch renderExpr(n.Fun) {
			case "p." + guard + ".Lock":
				locks = append(locks, n.Pos())
			case "p." + guard + ".Unlock":
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

// renderExpr 把选择器链渲染成 "p.mu.Lock" 形式的字符串，便于按名匹配。
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
