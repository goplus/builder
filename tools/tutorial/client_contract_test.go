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

// TestClientCoversAllWireNames 守住框架两个半边的 wire 契约：Go 侧（本包）发送的
// 每个 capability 名，TS 侧（client.ts 的 capabilities 表）都必须接住，反之亦然。
//
// 两侧名单都从源码提取而不是手写清单——此前 spx-gui 里的 vitest 版靠手写的
// 名字数组，两边一起忘改时照样绿；这里改任何一侧的 wire 名，测试立刻红。
func TestClientCoversAllWireNames(t *testing.T) {
	goNames := collectGoWireNames(t)
	tsNames := collectClientCapabilityNames(t)

	if len(goNames) == 0 || len(tsNames) == 0 {
		t.Fatalf("extraction broke: %d Go names, %d client.ts names", len(goNames), len(tsNames))
	}
	if fmt.Sprint(goNames) != fmt.Sprint(tsNames) {
		t.Errorf("wire names diverge:\n  Go sends:  %v\n  client.ts: %v", goNames, tsNames)
	}

	// capabilityKinds 是能力名 → 执行语义的登记表，键必须都是真实存在的
	// capability——表里的拼写错误会变成无效登记（静默退化为不让位）。
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

// fastCapabilities 是**有意**不让位的能力清单：只等宿主自身计算，或按契约
// 受理/显示即返。运行时对未登记能力的默认虽然是安全的不让位，但分类必须是
// 有意识的决定——新增能力时要么进 capabilityKinds，要么进这里。
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

// TestEveryCapabilityIsClassified 强制每个 capability 都被显式分类过：
// 运行时的保守默认（未登记=不让位）不能成为漏分类的藏身处。
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

// TestFrameworkRegistersEveryContractEvent 守住事件名契约：框架向执行器注册的
// 事件名全集（eventDeliverers 的键）必须与契约 module_TutorialFramework.ts 里
// TutorialEvent 联合类型的 name 全集相等。执行器对未注册的事件名静默忽略，
// 所以新增事件时漏注册一侧不会有任何报错，只能靠这里变红。
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

// collectContractEventNames 从契约的 TutorialEvent 联合类型里收集 name 字面量。
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

// collectGoWireNames 从本包全部 Go 源文件里收集 mustCallCapability 的首个字符串实参。
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

// collectClientCapabilityNames 从 client.ts 的 capabilities 字面量里收集键名
// （形如行首缩进后的 `name: (`）。
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
