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
