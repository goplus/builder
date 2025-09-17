package svgbeautify

import (
	"fmt"
	"strings"
	"testing"
)

func TestShowBeautificationResult(t *testing.T) {
	// 简单测试SVG
	simpleSVG := `<svg><path d="M10,10 L20,15 L30,10 L40,20 L50,10"/></svg>`

	fmt.Println("=== SVG 美化和平滑测试 ===")

	// 测试基础简化
	result1, err := BeautifySVG(simpleSVG, BeautifyOptions{
		Epsilon:      2.0,
		EnableSmooth: false,
	})
	if err != nil {
		t.Fatalf("简化失败: %v", err)
	}

	fmt.Printf("原始SVG: %s\n", simpleSVG)
	fmt.Printf("简化后: %s\n", result1.BeautifiedSVG)
	fmt.Printf("点减少率: %.1f%%\n\n", result1.ReductionRate)

	// 测试增强平滑功能
	result2, err := BeautifySVG(simpleSVG, BeautifyOptions{
		Epsilon:      2.0,
		EnableSmooth: true,
	})
	if err != nil {
		t.Fatalf("平滑失败: %v", err)
	}

	fmt.Printf("平滑后: %s\n", result2.BeautifiedSVG)
	fmt.Printf("包含曲线: %t\n", containsCurves(result2.BeautifiedSVG))
	fmt.Printf("长度变化: %+d 字符\n\n", len(result2.BeautifiedSVG)-len(simpleSVG))

	// 测试复杂路径
	complexSVG := `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1235.20007" height="780.79999" viewBox="0,0,1235.20007,780.79999"><g fill="none" fill-rule="nonzero" stroke="none" stroke-width="none" stroke-linecap="none" stroke-linejoin="none" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><path d="M0,780.79999v-780.79999h1235.20007v780.79999z" fill-opacity="0" fill="#000000" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" visibility="hidden"/><path d="M836.19998,202.2l-1,-1l-3,-1l-3,-2l-6,-2l-6,-6l-7,-4l-9,-6l-10,-6l-9,-6l-11,-4l-14,-3l-14,-4l-12,-1h-12h-12h-10l-41,19l-17,10l-15,10l-17,14l-12,15l-9,10l-8,11l-7,10l-3,11l-3,11l-2,13l-3,15l-15,91v13l2,12l3,11l2,13l2,12l2,11l3,12l2,14l2,12l16,30l6,4l5,2l7,2l7,1l8,3l11,1l12,3l92,19l17,3h15h13h12h12l8,-1l11,-1l12,-3l12,-1l34,-17l6,-6l4,-5l4,-4l1,-2l2,-2l1,-2v-3v-30l3,-9l1,-12l2,-12l2,-10v-10v-8v-6l1,-6v-7v-5v-7v-6v-7v-7l-2,-7l-2,-7l-2,-6l-4,-7l-3,-7l-2,-7l-7,-32l-2,-12l-2,-10l-1,-12l-2,-11l-3,-10l-1,-8l-2,-7v-6v-4v-4l-1,-5v-3v-4l-1,-2v-1v-1v-1v-3v-2l-1,-2l-3,-4v-2v0v-2h-1h-1h-1h-2h-3v0h-2h-2h-2h-2h-1h-2h-2h-2h-1" fill="none" stroke="#1f11ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M667.19998,274.2l-1,-2v-2l-2,-2l-1,-2l-2,-1l-2,-1h-1h-4h-6h-5l-8,2l-7,3l-7,6l-7,6l-8,7l-4,7l-5,7l-4,6l-2,4v4v2v2v1v1l3,2l2,2l3,2v3l3,1l29,11l8,2l8,3l8,1l10,1h9h2h3h1l3,-2v-2v-2v-3v-4v-5v-3l-2,-8l-1,-2v-1l-1,-3l-1,-5l-2,-4l-1,-3l-1,-3v-1l-1,-1v-1v-1l-1,-1h-1v-2v-1h-1l-2,-3l-1,-2l-1,-2h-1h-2v-1l-2,-3l-1,-1l-1,-1v-1" fill="none" stroke="#1f11ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M822.19998,301.2l-5,-4l-6,-5l-7,-5l-4,-3h-2l-3,-1h-2h-2h-4l-3,1l-5,4l-3,8l-3,14l-4,12l-2,13l-1,9v8v2v2l1,3l1,1l1,1l2,1l1,1l3,1l1,1l3,2h1h3h4h4h3h4h4h3h3l4,-1l2,-2h2h1l1,-2l1,-2l1,-2v-2h1v-2v-1v-1v-1l-1,-10l-1,-1v-1l-1,-3v0l-1,-1l-1,-3v-1v-2v-2" fill="none" stroke="#1f11ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M682.19998,455.2h1v1l1,2v3l1,3l2,2v2v2v1h1v1l2,2l1,2l1,3l1,1l2,2v2l2,2l1,1l1,1v0h1h2h1h2h2h4h6h5l29,-12l5,-4l3,-1l4,-2l2,-2l2,-1l1,-2l3,-1v-2l2,-2v-3v-1v-1" fill="none" stroke="#1f11ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`
	result3, err := BeautifySVG(complexSVG, BeautifyOptions{
		Epsilon:      4.0,
		EnableSmooth: true,
	})
	if err != nil {
		t.Fatalf("复杂路径平滑失败: %v", err)
	}

	fmt.Printf("复杂路径原始: %s\n", complexSVG)
	fmt.Printf("复杂路径平滑: %s\n", result3.BeautifiedSVG)
	fmt.Printf("曲线张力: 增强 (0.6)\n")
}

// containsCurves checks if SVG contains curve commands
func containsCurves(svg string) bool {
	return strings.Contains(svg, " C") || strings.Contains(svg, "C") && strings.Contains(svg, ",")
}

