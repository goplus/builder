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

// This file promotes the scheduler's locking discipline from comments to
// mechanical checks. The rules it guards:
//
//  1. The execution token flows only through acquireExec/releaseExec, and only
//     runFrame and yieldWhile may call them: a run has exactly one yield
//     point, with no ad-hoc yielding scattered elsewhere.
//  2. yieldWhile is entered only from mustCallCapability, which waits on the
//     host, and from join, which queues under OneAtATime; the bridge's
//     callCapability appears only in mustCallCapability.
//  3. No operation that can block appears while schedulerMu is held (channel
//     send or receive, select, Wait, taking the token, calling the bridge);
//     registryMu and groupMu are leaf locks whose regions allow only
//     allowlisted calls.
//  4. Runs have a single lifecycle entry: startRuns is called only by Start
//     and the package-level event deliverers; admitRun only by startRuns and
//     goLive; cancel only by join; markYielded only by runFrame and
//     yieldWhile.
//  5. Events have a single entry: handlers are registered with the executor
//     only in init; events.attach is called only by XGot_Course_Main and
//     events.goLive only by Start.
//
// The checks work on the AST rather than on observed behavior, so a violating
// way of writing things turns red as it enters the repository instead of
// waiting for a test to happen to hit that interleaving.
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

// The allowlists for the rules above: the only functions entitled to perform
// each operation.
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

	// Rules 1, 2 and 4: check by identifier who is entitled to call what.
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

	// Rule 3: no blocking operation while schedulerMu is held; registryMu and
	// groupMu are leaf locks whose regions allow only allowlisted calls.
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
						(strings.HasSuffix(callee, ".Lock") && callee != recv+"."+guard+".Lock") // schedulerMu is innermost and nests no other lock
					if blocking {
						report(n.Pos(), "%s called inside a %s-held region of %s", callee, guard, name)
					}
				}
				return true
			})
		}
	}
}

// leafLockAllowedCalls lists the only calls allowed while each leaf lock is
// held: all pure computation, unable to block and unable to reach another
// lock. Decoding, dispatching, cancelling and waiting must happen outside the
// lock.
var leafLockAllowedCalls = map[string]map[string]bool{
	"registryMu": {"len": true, "append": true, "make": true, "fmt.Errorf": true, "json.RawMessage": true},
	"groupMu":    {"len": true, "append": true, "close": true},
}

type lockRegion struct {
	from, to token.Pos
}

// receiverName returns the method receiver's name; a plain function such as
// startRuns refers to the program as p by convention.
func receiverName(fn *ast.FuncDecl) string {
	if fn.Recv != nil && len(fn.Recv.List) > 0 && len(fn.Recv.List[0].Names) > 0 {
		return fn.Recv.List[0].Names[0].Name
	}
	return "p"
}

// heldRegions computes the regions of fn where guard (<recv>.<guard>) is
// held. Both spellings are covered: an explicit Unlock gives [Lock, Unlock),
// a deferred Unlock gives [Lock, end of function).
func heldRegions(fn *ast.FuncDecl, recv, guard string) []lockRegion {
	var locks, unlocks []token.Pos
	deferred := false

	ast.Inspect(fn.Body, func(node ast.Node) bool {
		switch n := node.(type) {
		case *ast.DeferStmt:
			if renderExpr(n.Call.Fun) == recv+"."+guard+".Unlock" {
				deferred = true
			}
			return false // an Unlock inside defer is not an explicit unlock point
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
			// Every explicit Unlock precedes the Lock, which happens with
			// branching code: conservatively take the end of the function.
			end = fn.Body.End()
		}
		regions = append(regions, lockRegion{from: lock, to: end})
	}
	return regions
}

// renderExpr renders a selector chain as a string like "p.schedulerMu.Lock",
// so the rules above can match on names.
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
