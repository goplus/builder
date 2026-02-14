# Sprite Editor 界面提示词

目标：基于 spx-gui 的视觉语言与交互习惯，生成 1440×900 的 Sprite Editor 界面。结构参考 `redesign/sprite-editor1.jpg` 与 `redesign/sprite_editor.json`。

## 布局结构
- 顶部导航栏：高度 50~56，主色 #0BC0CF，左侧品牌与导航，中间项目名，右侧运行/发布/云同步等操作。
- 主体区域：水平布局，左 888 宽编辑区 + 右 492 宽辅助区。背景浅青 #DFF7F9 / #EAF6F7。

## 左侧编辑区（Editor Left Panel）
- 顶部编辑导航（Editor Nav Bar）：
  - Tabs：代码/造型/动画，选中态用主色填充胶囊按钮。
  - 右侧操作：格式化按钮。
- 编辑主体（Editor Body）：横向三列
  1) 工具栏（Controls，宽 60）：垂直图标按钮栈（40×40）。
  2) 资产面板（Asset Panel，宽 306）：上方精灵列表（高度约 190），下方属性面板（占满）。
  3) 代码区（Code Area）：占满剩余空间，白色卡片 + 浅边框。

## 右侧辅助区（Right Column）
- Sprite/Stage 区域：水平布局
  - Sprites/Sounds 主区（填充剩余宽度）
  - Stage 竖栏（宽 80）
- Preview Window：
  - Header：左侧“预览”，右侧“新建”按钮
  - 预览画布：4:3 比例视觉区域

## 视觉样式
- 卡片：白底、圆角 8、边框 #E5E7EB。
- 按钮：高度 28，圆角 14（胶囊），主色 #0BC0CF。
- 文字：Inter，常用 12/14/16，正文 #0F172A / 次要 #334155。
- 间距：主体 gap 12，组件内部 gap 8。

## 交互强调
- Tabs、工具栏按钮、预览/新建等核心交互具有清晰的选中/悬停态。
- 重点区域（代码区/预览区）边界清晰、留白充足，强调内容聚焦。

*理解 01_xbuilder/builder-dev/spx-gui ，基于你的理解，生成 sprite editor 界面，
界面结构参考 01_xbuilde结构参考 redesign/sprite-editor1.jpg  与 01_xbuil  与 der/redesign/sprite_editor.json
*直接在sprite-editor-01.pen 上做高保真复刻

## 相关链接
- spx-gui/src/components/ui/fonts
- spx-gui/src/components/ui/tokens/index.ts
- spx-gui/src/components/navbar
- spx-gui/src/components/ui/icons
- spx-gui/src/components/ui/UIConfigProvider.vue
- spx-gui/src/components/ui/tokens/index.ts
- spx-gui/src/components/ui/tokens/colors.ts
