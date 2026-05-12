# AI 设计稿复刻工作流

使用 AI（Claude Code / Gemini）通过 Pencil MCP 协议复刻 Figma 设计稿。

## 前置条件

- 设计稿图片（Figma 导出 PNG/JPG）
- 组件库：[builder-component.lib.pen](../components/spx/builder-component.lib.pen)
- 页面目录：`ui/pages/spx/*.pen`

## 工作流程

### Step 1: 构建结构

| 输入 | 输出 |
| ---- | ---- |
| 设计稿图片 + 组件库/页面文件 | 页面骨架布局（忽略样式细节） |

**Prompt 示例**：

> 读取 `ui/components/spx/builder-component.lib.pen` 和 `ui/pages/spx` 目录下的 .pen 文件，参照上传的设计稿图片，在当前画布空白区域构建 [页面名称] 页面结构。

### Step 2: 调整样式

| 输入 | 输出 |
| ---- | ---- |
| Step 1 生成的页面 | 符合设计规范的完整页面 |

**Prompt 示例**：

| 场景 | Prompt |
| ---- | ------ |
| 全局 | 按照组件库中的设计规范修正页面颜色/间距/字体，使用变量引用。 |
| 局部 | 修正 `[图层名称]` 的样式，参照组件库规范。 |

> **注意**：`[图层名称]` 必须与 Pencil 画布中的实际名称一致。

## 最佳实践

- 小范围修改优先手动调整
- 批量修改交给 AI 处理
- 保持对话上下文连续性
