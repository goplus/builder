# SVG 美化工具包

## 功能说明

这是一个Go语言的SVG图形美化工具包，主要特性包括：

1. **路径简化** - 使用Ramer-Douglas-Peucker算法减少不必要的点
2. **增强平滑** - 改进的贝塞尔曲线平滑算法，更强的平滑效果
3. **智能保护** - 自动检测复杂图案并保护细节
4. **简洁API** - 提供简单易用的函数接口

## 文件结构

```
internal/svgbeautify/
├── types.go            // 数据类型定义
├── rdp.go              // RDP算法实现
├── parser.go           // SVG解析器
├── smoothing.go        // 曲线平滑功能
├── builder.go          // SVG构建器
├── service.go          // 核心工具函数
├── svgbeautify_test.go     // 单元测试
├── example_test.go         // 使用示例
└── show_result_test.go     // 结果展示测试
```

## 基本使用

### 导入包

```go
import "your-project/internal/svgbeautify"
```

### 基本美化

```go
svgContent := `<svg width="100" height="100">
    <path d="M 10 10 L 20 20 L 30 30 L 40 40 L 50 50" stroke="black" fill="none"/>
</svg>`

// 使用默认参数美化
result, err := svgbeautify.BeautifySVG(svgContent)
if err != nil {
    log.Fatal(err)
}

fmt.Printf("点减少率: %.2f%%\n", result.ReductionRate)
fmt.Println("美化后的SVG:", result.BeautifiedSVG)
```

### 自定义参数

```go
// 使用自定义参数进行增强平滑
result, err := svgbeautify.BeautifySVG(svgContent, svgbeautify.BeautifyOptions{
    Epsilon:       2.0,  // 简化阈值
    EnableSmooth:  true, // 启用增强平滑
    PreSimplify:   true, // 预简化短线段
    MinSegmentLen: 1.0,  // 最小线段长度
})
```

### 便捷函数

```go
// 仅简化路径
simplified, err := svgbeautify.SimplifySVG(svgContent, 1.5)

// 仅应用曲线平滑
smoothed, err := svgbeautify.SmoothSVG(svgContent, 1.0)
```

## API参考

### 主要函数

#### BeautifySVG
```go
func BeautifySVG(svgContent string, options ...BeautifyOptions) (*BeautifyResult, error)
```
主要的美化函数，支持路径简化和曲线平滑。

**参数:**
- `svgContent`: SVG内容字符串
- `options`: 可选的美化参数

**返回:**
- `BeautifyResult`: 包含美化后的SVG和统计信息
- `error`: 错误信息

#### SimplifySVG
```go
func SimplifySVG(svgContent string, epsilon float64) (string, error)
```
便捷函数，仅进行路径简化。

#### SmoothSVG
```go
func SmoothSVG(svgContent string, epsilon float64) (string, error)
```
便捷函数，进行路径简化并应用曲线平滑。

### 数据结构

#### BeautifyOptions
```go
type BeautifyOptions struct {
    Epsilon       float64 // RDP简化阈值 (默认: 3.0)
    EnableSmooth  bool    // 启用增强平滑 (默认: false)
    PreSimplify   bool    // 预简化短线段 (默认: true)
    MinSegmentLen float64 // 最小线段长度 (默认: 1.0)
}
```

#### BeautifyResult
```go
type BeautifyResult struct {
    BeautifiedSVG string  // 美化后的SVG内容
    ReductionRate float64 // 点减少的百分比
}
```

## 运行测试

```bash
cd spx-backend/internal/svgbeautify

# 运行所有测试
go test -v

# 查看美化结果演示
go test -run TestShowBeautificationResult -v
```

## 平滑效果说明

### 增强平滑特性
- **曲线张力**: 0.6 (增强，更明显的曲线效果)
- **控制点距离**: 40% (更强的曲线弯曲)
- **智能阈值**: 自动降低到2个点也能平滑

### 平滑前后对比
```
原始: M10,10 L20,15 L30,10 L40,20 L50,10
平滑: M10,10 C23.5,13.25 26.8,9.2 30,10 C33.2,10.8 36.8,20 40,20 C43.2,20 46.5,13.5 50,10
```

## 注意事项

1. **保形效果**: 默认参数保守，保护复杂图案（如笑脸）不变形
2. **精度控制**: 输出保留3位小数，自动去除多余的0
3. **增强平滑**: 启用平滑会生成更强的贝塞尔曲线效果
4. **智能参数**: 根据SVG复杂度自动调整简化参数

## 技术细节

### Ramer-Douglas-Peucker算法
- 用于路径简化，减少点数同时保持形状特征
- epsilon值控制简化程度，默认3.0保护细节

### 增强贝塞尔平滑
- 使用三次贝塞尔曲线替代直线段
- 张力参数0.6提供更强的平滑效果
- 智能控制点计算，考虑相邻点方向

### SVG解析支持
- 支持所有标准路径命令：M, L, H, V, C, S, Q, T, A, Z
- 自动处理相对坐标和绝对坐标转换
- 保留原始SVG的样式和属性信息