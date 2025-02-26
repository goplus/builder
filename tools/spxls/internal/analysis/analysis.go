package analysis

import (
	"github.com/goplus/builder/tools/spxls/internal/analysis/passes/appends"
	"github.com/goplus/builder/tools/spxls/internal/protocol"
)

// Analyzer augments a [protocol.Analyzer] with additional LSP configuration.
//
// Analyzers are immutable, since they are shared across multiple LSP sessions.
type Analyzer struct {
	analyzer    *protocol.Analyzer
	nonDefault  bool
	actionKinds []protocol.CodeActionKind
	severity    protocol.DiagnosticSeverity
	tags        []protocol.DiagnosticTag
}

// Analyzer returns the [protocol.Analyzer] that this Analyzer wraps.
func (a *Analyzer) Analyzer() *protocol.Analyzer { return a.analyzer }

// EnabledByDefault reports whether the analyzer is enabled by default for all sessions.
// This value can be configured per-analysis in user settings.
func (a *Analyzer) EnabledByDefault() bool { return !a.nonDefault }

// ActionKinds is the set of kinds of code action this analyzer produces.
//
// If left unset, it defaults to QuickFix.
// TODO(rfindley): revisit.
func (a *Analyzer) ActionKinds() []protocol.CodeActionKind { return a.actionKinds }

// Severity is the severity set for diagnostics reported by this analyzer.
// The default severity is SeverityWarning.
//
// While the LSP spec does not specify how severity should be used, here are
// some guiding heuristics:
//   - Error: for parse and type errors, which would stop the build.
//   - Warning: for analyzer diagnostics reporting likely bugs.
//   - Info: for analyzer diagnostics that do not indicate bugs, but may
//     suggest inaccurate or superfluous code.
//   - Hint: for analyzer diagnostics that do not indicate mistakes, but offer
//     simplifications or modernizations. By their nature, hints should
//     generally carry quick fixes.
//
// The difference between Info and Hint is particularly subtle. Importantly,
// Hint diagnostics do not appear in the Problems tab in VS Code, so they are
// less intrusive than Info diagnostics. The rule of thumb is this: use Info if
// the diagnostic is not a bug, but the author probably didn't mean to write
// the code that way. Use Hint if the diagnostic is not a bug and the author
// indended to write the code that way, but there is a simpler or more modern
// way to express the same logic. An 'unused' diagnostic is Info level, since
// the author probably didn't mean to check in unreachable code. A 'modernize'
// or 'deprecated' diagnostic is Hint level, since the author intended to write
// the code that way, but now there is a better way.
func (a *Analyzer) Severity() protocol.DiagnosticSeverity {
	if a.severity == 0 {
		return protocol.SeverityWarning
	}
	return a.severity
}

// Tags is extra tags (unnecessary, deprecated, etc) for diagnostics
// reported by this analyzer.
func (a *Analyzer) Tags() []protocol.DiagnosticTag { return a.tags }

// String returns the name of this analyzer.
func (a *Analyzer) String() string { return a.analyzer.String() }

// DefaultAnalyzers holds the set of Analyzers available to all gopls sessions,
// independent of build version, keyed by analyzer name.
//
// It is the source from which gopls/doc/analyzers.md is generated.
var DefaultAnalyzers = make(map[string]*Analyzer) // initialized below

func init() {
	// See [Analyzer.Severity] for guidance on setting analyzer severity below.
	analyzers := []*Analyzer{
		// The traditional vet suite:
		{analyzer: appends.Analyzer},
	}
	for _, analyzer := range analyzers {
		DefaultAnalyzers[analyzer.analyzer.Name] = analyzer
	}
}
