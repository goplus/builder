package tutorial

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"testing"
)

// TestClientCoversAllWireNames guards the wire contract between the
// framework's two halves: every capability name the Go side (this package)
// sends must be received by the TS side (client.ts's capabilities table), and
// the other way round.
//
// Both lists are extracted from the sources rather than hand-written. The
// earlier vitest version in spx-gui relied on a hand-written array of names
// and stayed green whenever both sides were forgotten together; here, changing
// a wire name on either side turns the test red at once.
func TestClientCoversAllWireNames(t *testing.T) {
	goNames := collectGoWireNames(t)
	tsNames := collectClientCapabilityNames(t)

	if len(goNames) == 0 || len(tsNames) == 0 {
		t.Fatalf("extraction broke: %d Go names, %d client.ts names", len(goNames), len(tsNames))
	}
	if fmt.Sprint(goNames) != fmt.Sprint(tsNames) {
		t.Errorf("wire names diverge:\n  Go sends:  %v\n  client.ts: %v", goNames, tsNames)
	}

	// capabilityKinds maps capability names onto execution semantics, so
	// every key must name a capability that really exists: a typo there
	// becomes a dead entry that silently degrades to not yielding.
	known := map[string]bool{}
	for _, name := range goNames {
		known[name] = true
	}
	for name := range capabilityKinds {
		if !known[name] {
			t.Errorf("capabilityKinds has %q, which is not a capability the Go side sends", name)
		}
	}
}

// fastCapabilities lists the capabilities that deliberately do not yield:
// they either wait only on the host's own computation, or, per the contract,
// return as soon as the request is accepted or shown. The runtime default for
// an unregistered capability is the safe one, not yielding, but the
// classification must still be a conscious decision: a new capability goes
// either into capabilityKinds or here.
var fastCapabilities = map[string]bool{
	"course_complete":                   true,
	"course_completeWith":               true,
	"editor_codeEditor_filterAPIs":      true,
	"editor_codeEditor_formatWorkspace": true,
	"editor_project_getCode":            true,
	"editor_project_listSprites":        true,
	"editor_ruler_show":                 true,
	"editor_ruler_hide":                 true,
	"spotlight_reveal":                  true,
}

// TestEveryCapabilityIsClassified requires every capability to be classified
// explicitly: the conservative runtime default, unregistered meaning no
// yielding, must not become a hiding place for one that was overlooked.
func TestEveryCapabilityIsClassified(t *testing.T) {
	for _, name := range collectGoWireNames(t) {
		_, waiting := capabilityKinds[name]
		fast := fastCapabilities[name]
		switch {
		case waiting && fast:
			t.Errorf("%q is classified as both waiting and fast", name)
		case !waiting && !fast:
			t.Errorf("%q is not classified: add it to capabilityKinds or fastCapabilities", name)
		}
	}
}

// TestFrameworkRegistersEveryContractEvent guards the event-name contract:
// the set of event names the framework registers with the executor (the keys
// of eventDeliverers) must equal the set of names in the TutorialEvent union
// in the contract's module_TutorialFramework.ts. The executor silently ignores
// an unregistered event name, so forgetting one side when adding an event
// produces no error at all and only turning red here catches it.
func TestFrameworkRegistersEveryContractEvent(t *testing.T) {
	registered := map[string]bool{}
	for name := range eventDeliverers {
		registered[name] = true
	}
	goNames := sortedKeys(registered)
	contractNames := collectContractEventNames(t)

	if len(goNames) == 0 || len(contractNames) == 0 {
		t.Fatalf("extraction broke: %d registered names, %d contract names", len(goNames), len(contractNames))
	}
	if fmt.Sprint(goNames) != fmt.Sprint(contractNames) {
		t.Errorf("event names diverge:\n  framework registers: %v\n  contract declares:   %v", goNames, contractNames)
	}
}

// collectContractEventNames collects the name literals from the contract's
// TutorialEvent union.
func collectContractEventNames(t *testing.T) []string {
	t.Helper()
	source, err := os.ReadFile(filepath.Join("..", "..", "docs", "develop", "tutorial-v2", "module_TutorialFramework.ts"))
	if err != nil {
		t.Fatal(err)
	}
	text := string(source)
	start := strings.Index(text, "export type TutorialEvent =")
	if start < 0 {
		t.Fatal("contract has no TutorialEvent union")
	}
	block := text[start:]
	if end := strings.Index(block, "\n\n"); end >= 0 {
		block = block[:end]
	}
	pattern := regexp.MustCompile(`name: "([A-Za-z.]+)"`)
	names := map[string]bool{}
	for _, match := range pattern.FindAllStringSubmatch(block, -1) {
		names[match[1]] = true
	}
	return sortedKeys(names)
}

// collectGoWireNames collects the first string argument of every
// mustCallCapability call across this package's Go sources.
func collectGoWireNames(t *testing.T) []string {
	t.Helper()
	pattern := regexp.MustCompile(`mustCallCapability\("([A-Za-z_]+)"`)

	files, err := filepath.Glob("*.go")
	if err != nil {
		t.Fatal(err)
	}
	names := map[string]bool{}
	for _, file := range files {
		if strings.HasSuffix(file, "_test.go") {
			continue
		}
		source, err := os.ReadFile(file)
		if err != nil {
			t.Fatal(err)
		}
		for _, match := range pattern.FindAllStringSubmatch(string(source), -1) {
			names[match[1]] = true
		}
	}
	return sortedKeys(names)
}

// collectClientCapabilityNames collects the keys of client.ts's capabilities
// literal, which appear as an indented `name: (` at the start of a line.
func collectClientCapabilityNames(t *testing.T) []string {
	t.Helper()
	source, err := os.ReadFile("client.ts")
	if err != nil {
		t.Fatal(err)
	}
	pattern := regexp.MustCompile(`(?m)^\s+([A-Za-z_]\w*): \(`)
	names := map[string]bool{}
	for _, match := range pattern.FindAllStringSubmatch(string(source), -1) {
		names[match[1]] = true
	}
	return sortedKeys(names)
}

func sortedKeys(set map[string]bool) []string {
	keys := make([]string, 0, len(set))
	for key := range set {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}
