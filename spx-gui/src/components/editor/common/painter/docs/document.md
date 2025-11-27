# PainterBoard 架构与模块说明

## 总览

- 核心画布：基于 Paper.js 的 `paintBoard.vue`，负责初始化画布、背景、缩放边界、提供事件分发与依赖注入。
- 工具体系：每个绘图/编辑工具是独立的 Vue 组件（如 `draw_line.vue`、`select_tool.vue` 等），通过 `provide/inject` 获取画布接口与状态。
- 事件委托：`utils/delegator.ts` 将原生鼠标事件统一转为画布坐标并分发给当前激活工具，解耦画布与工具的事件绑定。
- 状态/历史：`HistoryManager` 基于 sessionStorage 维护 SVG 历史，实现 undo/redo；`ImportExportManager` 负责导入/导出 SVG/图片并同步路径集合。
- 工具链路：工具产出的路径集合统一通过 `setAllPathsValue` 更新，触发历史记录与导出事件，保持画布与外部状态同步。

## 运行时框架

1. 初始化 (`paintBoard.vue`)
   - 设置 Paper.js 画布尺寸与背景路径，计算边界矩形以约束视口。
   - 创建工具引用与依赖注入：`getAllPathsValue`/`setAllPathsValue`、`exportSvgAndEmit`、`currentTool`、`boundaryRect` 等。
   - 初始化 `HistoryManager`（含恢复回调）与 `ImportExportManager`，绑定快捷键、全局鼠标事件。
2. 事件流
   - 画布原生事件 → `CanvasEventDelegator.delegate` → 当前工具的处理器（`handleCanvasClick`/`handleMouseMove` 等）。
   - 工具在需要时调用 `setAllPathsValue` 更新全局路径集合，并触发 `exportSvgAndEmit` 推送 SVG。
3. 数据流
   - `allPaths` 作为 Paper.js Path/Shape 的集合，是选区、变形、擦除等操作的核心数据。
   - 历史记录保存的是导出的 SVG 字符串；恢复时通过 `ImportExportManager.importSvg` 重新生成路径并同步 `allPaths`。
4. 导入/导出
   - 导出：`ImportExportManager.exportSvgAndEmit` 隐藏辅助图形、按需缩放为舞台尺寸，输出 SVG 字符串并向父组件 emit。
   - 导入：支持 SVG、图片 URL、AIGC 返回的 SVG；导入后可选居中/放大到编辑尺度，并重新收集可编辑路径。

## 核心模块拆解

### `paintBoard.vue`

- UI：顶部工具栏（颜色、粗细、AI 生成/美化、撤销重做等）、左侧工具网格、右侧画布区域。
- 依赖注入：向工具组件提供路径访问、当前工具、背景、边界、导出方法等。
- 边界控制：以舞台尺寸为基准扩展一个边界矩形，配合缩放限制，防止视图移出可编辑范围。
- 快捷键：`Cmd/Ctrl+Z` 撤销、`Cmd/Ctrl+Shift+Z` 或 `Cmd/Ctrl+Y` 重做

### 工具层（`components/`）

- `select_tool.vue`：选区/框选/多选/缩放/移动/删除，隐藏辅助图形避免导出污染。
- `draw_line.vue`：两点成线，含视图坐标预览层。
- `draw_brush.vue`：笔刷，支持轨迹简化与区域笔触（通过 `strokeRegionController` 生成填充区域）。
- `fill_tool.vue`：智能填充，按优先级选择路径并填充颜色，带自定义光标。
- `eraser_tool.vue`：橡皮擦，复用笔触区域生成逻辑进行命中判断与擦除。
- `rectangle_tool.vue`、`circle_tool.vue`：基础图形绘制。
- `reshape_tool.vue`：节点级编辑与控制点展示，用于变形。
- `text_tool.vue`：文本插入与编辑。
- `select_color.vue`、`brush_thickness.vue`、`zoom_control.vue`：颜色、粗细、缩放控制。
- AI 相关：`aiBeautifyModal.vue`、`aigc` 组件，通过事件回调导入生成的 SVG。

### 工具辅助与算法（`utils/`）

- `delegator.ts`：事件委托器，转换视图坐标到项目坐标，按工具类型分发 `click/mousedown/mousemove/...`。
- `history-manager.ts`：历史栈（最大 64），保存/恢复 SVG，支持初始空白状态。
- `import-export-manager.ts`：统一导入/导出入口，处理背景隐藏、缩放到导出尺度、路径收集、图片作为背景等。
- `strokeRegionController.ts`：笔触采样 → 曲线简化 → 膨胀为区域（PaperOffset），供笔刷/橡皮擦命中与填充。
- `clear-canvas.ts`：清空画布并重置背景/工具状态，触发导出。
- `coordinate-transform.ts`：项目坐标与视图坐标转换、缩放距离换算。
- `view-update-scheduler.ts`：`requestAnimationFrame` 合帧更新，避免频繁 `paper.view.update`。
- `canvasSize.ts`：获取父容器尺寸，防止零尺寸。

## 关键设计思路

- 解耦：画布只关心 Paper.js 与路径集合；工具组件只通过注入的接口读写路径和触发导出，互不直接依赖。
- 单一数据源：`allPaths` 为唯一可编辑集合，任何变动通过 `setAllPathsValue` 记录历史与导出，保证撤销/外部同步一致。
- 导出安全性：导出前隐藏控制点、背景；导出时缩放到舞台尺寸，避免编辑态放大导致的文件过大。
- 性能：事件节流、路径简化、区域命中/偏移算法减少重绘和冗余点。
- 可扩展：新增工具只需实现对应事件处理器并通过 `CanvasEventDelegator` 注册即可，导入/导出、历史与注入接口自动复用。

## 当前存在的问题

- select_tool中拖拽缩放存在一定的性能问题，且缩放不太跟手。可以考虑引入节流或者重构缩放更新逻辑
- select_tool在处理外部输入图片时，特别是有透明背景边框的图片时会有问题，总是会选中图片自带背景中的透明边框。考虑在图片导入时对这种透明背景进行特殊处理，或者在选择时对这种特殊透明背景进行特别处理
- AI相关api和处理逻辑需要和新的后端架构对接

## 未来规划的功能

- 边框颜色/粗细控制 （参考scratch的outline相关）
- 对象组合/拆散功能（group/ungroup）
- 图层管理控制 （layer management）
  可参考https://github.com/petezhuang/builder/issues
