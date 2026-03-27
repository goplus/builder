# Design to Code Mapping Guide

本文记录 `ui/components/spx/builder-component.lib.pen` 与 `spx-gui` 前端实现之间的对应关系，供后续开发者同步设计稿到代码时使用。

## Scope

- 设计库文件：`ui/components/spx/builder-component.lib.pen`
- 前端代码库：`spx-gui`
- 技术栈：Vue 3 + TypeScript

最重要的结论只有一条：

`builder-component.lib.pen` 不是“一个设计组件 = 一个 Vue 文件”的映射关系。它更像是一个设计组件库，前端代码通常拆成三层：

1. 视觉基础组件：`spx-gui/src/components/ui/**`
2. 编辑器业务组件：`spx-gui/src/components/editor/**`
3. 页面级布局入口：`spx-gui/src/pages/editor/index.vue`

后续同步设计稿时，先判断变更属于哪一层，再改代码，不要只按设计组件名字在代码里做同名搜索。

## Mapping Rules

### 1. `Button/*` 先看 `UIButton.vue`

设计库中的按钮族基本都落在同一个基础组件：

- 代码入口：`spx-gui/src/components/ui/UIButton.vue`
- 预览页：`spx-gui/src/pages/docs/ui-design.vue`

设计名里的几个维度，对应 `UIButton` 的 props：

| 设计维度 | 代码 props |
|----------|------------|
| `Primary / Secondary / Boring / White / Danger / Success / Blue / Purple / Yellow` | `color` |
| `Large / Medium / Small` | `size` |
| `Shadow / Flat / Stroke` | `variant` |
| `Square / Circle` | `shape` |
| `Loading / Disabled` | `loading` / `disabled` |
| `Button-only icon/*` | 只传 `icon`，不传默认 slot 文本 |

例如：

- `Button/Large/Primary/Shadow/Square/Default`
  - `\<UIButton color="primary" size="large" variant="shadow" shape="square" \>`
- `Button-only icon/Large/Primary/Shadow/Circle/Default`
  - `\<UIButton color="primary" size="large" variant="shadow" shape="circle" icon="..." \>`

补充说明：

- 当前 `builder-component.lib.pen` 里的 button 叶子组件命名，已经按 `UIButton.vue` 的词表对齐：
  - `Solid` -> `Shadow`
  - `Flat-Stroke / Flat-stroke` -> `Stroke`
  - `Neutral` -> `Boring`
- 这里只统一了命名兼容性，不代表视觉一定与 `UIButton` 当前实现逐像素一致。
- 例如设计库里一部分 filled family 虽然名字已经回到 `Shadow`，但视觉上仍然是“40px 内容本体 + 无阴影”的规范。
- 真正同步到代码时，需要额外判断是直接复用现有 `shadow` 视觉，还是继续调整 `UIButton.vue` 的实现。

当前按钮库的实务基线有两点需要特别注意：

1. Button 叶子命名优先跟代码词表保持一致
- 本地 `builder-component.lib.pen` 中，button 叶子组件已经统一使用 `Shadow / Flat / Stroke`
- 后续如果继续扩 button family，优先沿用这套词表，不要再新增 `Solid` 或 `Flat-Stroke` 这样的平行命名

2. Page-level 引用通常经过聚合入口
- 页面通常不会直接依赖某个底层叶子 button 组件 ID
- 更常见的是引用聚合入口，例如：
  - `8dhVn` -> `Button-only icon/Default`
  - `bI2fk` -> `Button-only icon-flat`
  - `hZ2GE` -> `Button-only icon-flat-stroke`
- 所以如果设计库里发生“叶子组件删重 / 合并”，先检查聚合入口的 `slot` 是否同步更新，再判断页面是否需要改

### 2. `Card/* item*` 先看 `UIBlockItem` 这一层

设计库里的资源卡片并没有分别实现成一堆独立基础组件，而是统一落在 `UIBlockItem` 家族上：

- 基础外壳：`spx-gui/src/components/ui/block-items/UIBlockItem.vue`
- 标题样式：`spx-gui/src/components/ui/block-items/UIBlockItemTitle.vue`

在这个基础上，代码再分成几类中层组件：

| 设计组件族 | 基础/中层组件 | 业务组件入口 |
|------------|---------------|--------------|
| `Card/Sprite item/*` | `UIEditorSpriteItem.vue` | `SpriteItem.vue`、`CostumeItem.vue`、`AnimationItem.vue`、`CheckableCostumeItem.vue` |
| `Card/Sound item/*` | `UIEditorSoundItem.vue` | `stage/sound/SoundItem.vue` |
| `Card/Backdrop item/*` | `UIEditorBackdropItem.vue` | `stage/backdrop/BackdropItem.vue` |
| `Card/Widget item/*` | `UIEditorWidgetItem.vue` | `stage/widget/WidgetItem.vue` |
| `Card/Asset` | `UIBlockItem.vue` 作为统一抽象 | 被上面几类中层组件复用 |

大卡片版本也有对应实现：

- `spx-gui/src/components/ui/block-items/UISpriteItem.vue`
- `spx-gui/src/components/ui/block-items/UISoundItem.vue`
- `spx-gui/src/components/ui/block-items/UIBackdropItem.vue`

如果设计改动影响所有资源卡片的边框、圆角、激活态、hover 态、尺寸体系，优先改：

- `UIBlockItem.vue`
- `UIBlockItemTitle.vue`

如果只影响某一种资源卡片，优先改对应的 `UIEditor*Item.vue` 或业务组件。

### 3. 右上角 `Corner marker/*/More/*` 对应角标菜单

设计库里的精灵/背景卡片右上角更多按钮，对应的是下面这组组件：

- 角标图标：`spx-gui/src/components/ui/block-items/UICornerIcon.vue`
- 角标菜单封装：`spx-gui/src/components/editor/common/CornerMenu.vue`

业务使用点包括：

- `spx-gui/src/components/editor/sprite/SpriteItem.vue`
- `spx-gui/src/components/editor/sprite/AnimationItem.vue`
- `spx-gui/src/components/editor/sprite/CostumeItem.vue`
- `spx-gui/src/components/editor/stage/backdrop/BackdropItem.vue`
- `spx-gui/src/components/editor/stage/sound/SoundItem.vue`
- `spx-gui/src/components/editor/stage/widget/WidgetItem.vue`

所以如果设计稿只改“更多”按钮的尺寸、位置、颜色，改 `UICornerIcon.vue`；如果改菜单交互，改 `CornerMenu.vue` 或具体业务组件里的菜单项。

### 4. `Card/State item/*` 对应动画状态绑定弹窗

设计库里的 `Card/State item/Default|Step|Die/*`，代码里最接近的落地实现是：

- `spx-gui/src/components/editor/sprite/animation/state/BoundStateEditor.vue`

这里仍然复用了：

- `UIBlockItem.vue`
- `UICornerIcon.vue`

也就是说，这一类不是单独的 `StateCard.vue`，而是基于通用卡片抽象组合出来的。

### 5. `Card/Entry` / `Card/Entry item/*` 对应 Stage 快捷入口

设计库里的 `Card/Entry` 和其中的：

- `Card/Entry item/Backgrounds/*`
- `Card/Entry item/Sounds/*`
- `Card/Entry item/Widgets/*`

代码里最接近的实现不是资源卡片列表，而是 Stage 侧边面板里的快捷入口：

- `spx-gui/src/components/editor/panels/stage/StagePanel.vue`

这里的三个 quick action：

- Backdrops
- Sounds
- Widgets

就是当前前端里对这组设计语义的实际落地。

## Editor Structure Mapping

### 6. `editor-nav-panel` / `editor-panel-*` 对应编辑器顶部 tab 导航

设计稿里的：

- `editor-nav-panel`
- `editor-panel-sprite-code`
- `editor-panel-sprite-costumes`
- `editor-panel-sprite-animations`
- `editor-panel-stage-code`
- `editor-panel-stage-widgets`
- `editor-panel-stage-sounds`
- `editor-panel-stage-backdrops`

当前代码里拆成了以下几层：

- 顶部容器：`spx-gui/src/components/editor/common/EditorHeader.vue`
- Tabs 基础组件：`spx-gui/src/components/ui/tab/UITabs.vue`
- 单个 Tab：`spx-gui/src/components/ui/tab/UITab.vue`
- Sprite 编辑器入口：`spx-gui/src/components/editor/sprite/SpriteEditor.vue`
- Stage 编辑器入口：`spx-gui/src/components/editor/stage/StageEditor.vue`

额外的右侧操作也不是写死在设计组件里，而是通过 `#extra` slot 注入：

- Sprite Code 页的 `FormatButton`
- Stage Backdrops 页的 `BackdropModeSelector`

因此如果设计稿变的是 tab 样式，优先改 `UITab.vue`；如果变的是编辑器头部布局，改 `EditorHeader.vue`；如果变的是具体 tab 数量或切换逻辑，改 `SpriteEditor.vue` / `StageEditor.vue`。

### 7. `Segmented/*` 对应表单里的分段选择控件，而不是顶部导航 Tab

设计库里这类组件过去有一部分沿用 `Tab/*` 命名，但从设计语义看，它们更接近“分段选择 / segmented control”，不是编辑器顶部那种页面级导航 tab。

当前命名规范建议如下：

- 页面级导航继续使用 `tab` 语义：
  - `editor-nav-panel`
  - `editor-panel-*`
- 表单里用于二选一、多选一、模式切换的这类控件，统一使用 `Segmented/*` 命名，不再新增 `Tab/*`：
  - `Segmented/Text only/*`
  - `Segmented/Visibility/*`
  - `Segmented/Rotation/*`
  - `Segmented/Animation/*`
  - `Segmented/Code modal/*`

代码里这组设计更接近的实现是：

- `spx-gui/src/components/ui/radio/UITabRadioGroup.vue`
- `spx-gui/src/components/ui/radio/UITabRadio.vue`

目前最明确的落点是：

- `spx-gui/src/components/editor/code-editor/xgo-code-editor/ui/input-helper/InputHelper.vue`

也就是说：

- 如果设计稿改的是编辑器顶部页签切换，优先看 `UITabs.vue` / `UITab.vue`
- 如果设计稿改的是表单里的模式切换、选项切换、左右切换，优先看 `UITabRadioGroup.vue` / `UITabRadio.vue`

命名上的具体规则是：

- 设计库名称优先表达交互语义，不直接照搬 Vue 文件名
- 设计层使用 `Segmented/*`，代码映射文档再说明它对应 `UITabRadio*`
- 后续如果继续扩这类组件，不再新增 `Tab/Boring/*`、`Tab/Code modal/*` 这类旧命名

### 8. `left-panel-*` 对应 `EditorList` 这一类“左侧列表 + 右侧详情”布局

设计库里的：

- `left-panel-sprites`
- `left-panel-widgets`
- `left-panel-sounds`
- `left-panel-backdrops`

在代码里并没有同名组件，而是统一收敛到了 `EditorList` 抽象：

- `spx-gui/src/components/editor/common/EditorList.vue`
- 面板头部补充：`spx-gui/src/components/editor/panels/common/PanelHeader.vue`

然后由不同业务编辑器去组合它：

| 设计语义 | 代码入口 |
|----------|----------|
| Costume 列表 | `spx-gui/src/components/editor/sprite/CostumesEditor.vue` |
| Animation 列表 | `spx-gui/src/components/editor/sprite/AnimationEditor.vue` |
| Backdrop 列表 | `spx-gui/src/components/editor/stage/backdrop/BackdropsEditor.vue` |
| Sound 列表 | `spx-gui/src/components/editor/stage/sound/SoundsEditor.vue` |
| Widget 列表 | `spx-gui/src/components/editor/stage/widget/WidgetsEditor.vue` |

共同模式是：

1. 左侧资源列表由 `EditorList` 承载
2. 面板标题和右上角加号入口通常由 `PanelHeader` 承载
3. 列表项使用 `SpriteItem` / `BackdropItem` / `SoundItem` / `WidgetItem`
4. 右侧详情区使用 `CostumeDetail` / `AnimationDetail` / `BackdropDetail` / `SoundDetail` / `WidgetDetail`
5. 底部 add 按钮也统一由 `EditorList` 提供

所以如果设计稿改的是“左边资源列宽、加号按钮、右边详情布局”，不要去改单个 `Item`，应该优先看 `EditorList.vue`。

补充说明：

- 设计库中的 `List` 目前没有找到足够稳定的 1:1 Vue 对应物。
- 当前前端里最接近它职责的是 `PanelHeader.vue`、`EditorList.vue` 和具体列表组件，例如 `SpriteList.vue`。

### 8. `editor-main-panel` / `editor-center-panel` / `editor-workspace-panel` 是页面级布局概念

这些设计组件在当前代码里没有 1:1 同名实现。实际代码被拆成了页面级布局组件：

- 页面入口：`spx-gui/src/pages/editor/index.vue`
- 编辑器总装：`spx-gui/src/components/editor/ProjectEditor.vue`
- 预览区：`spx-gui/src/components/editor/preview/EditorPreview.vue`
- 右侧资源面板：`spx-gui/src/components/editor/panels/EditorPanels.vue`
- 地图模式：`spx-gui/src/components/editor/map-editor/MapEditor.vue`
- 通用卡片壳：`spx-gui/src/components/ui/UICard.vue`
- 通用卡片头：`spx-gui/src/components/ui/UICardHeader.vue`

这类设计节点更适合当作“布局概念图”，不要期待在代码里直接找到同名文件。

### 9. `editor-tools-panel` / `editor-blocks-panel` 目前没有直接同名落地

`builder-component.lib.pen` 里还能看到：

- `editor-tools-panel`
- `editor-blocks-panel`
- `editor-workspace-panel`

它们表达的是块编辑器/代码工作区的设计方向，但当前 `spx-gui` 并没有对应的同名 Vue 组件。现有职责分散在：

- `ProjectEditor.vue`
- `EditorPreview.vue`
- `SpriteEditor.vue`
- `StageEditor.vue`
- 代码编辑器相关组件

因此这几项应视为“概念对应”，不是“当前代码已有同名组件”。

## Preprocessing Mapping

### 10. `Card/Edit item/*` 对应素材预处理流程，不是单独卡片组件

设计稿中的：

- `Card/Edit item`
- `Card/Edit item/Remove background/*`
- `Card/Edit item/Split sprite sheet/*`

当前前端的实际落地是素材预处理弹窗这一整套流程：

- 总入口：`spx-gui/src/components/asset/preprocessing/PreprocessModal.vue`
- 左侧方法入口：`spx-gui/src/components/asset/preprocessing/common/ProcessItem.vue`
- 方法详情容器：`spx-gui/src/components/asset/preprocessing/common/ProcessDetail.vue`
- 去背景：`spx-gui/src/components/asset/preprocessing/remove-background/RemoveBackground.vue`
- 切分精灵表：`spx-gui/src/components/asset/preprocessing/split-sprite-sheet/SplitSpriteSheet.vue`

这里同样不是 1:1 文件映射，而是“设计里的编辑卡片概念，代码里落成了一个完整流程”。

## Token Mapping

设计库里的颜色最终落到 `spx-gui/src/components/ui/tokens/colors.ts`。

常用对应关系：

| 设计语义 | 代码 token |
|----------|------------|
| Primary 按钮青色 | `primary` / `turquoise` |
| Sprite 黄色系 | `sprite` / `yellow` |
| Stage、Sound 蓝色系 | `stage` / `sound` / `blue` |
| Danger 红色系 | `danger` / `red` |
| Success 绿色系 | `success` / `green` |
| 灰阶 | `grey` |

如果设计稿改的是整套颜色，不要直接在业务组件里写死颜色，优先改 token。

## Practical Lookup Order

以后同步 `builder-component.lib.pen` 到前端代码，建议按下面顺序定位：

1. 先看设计变更属于哪一类：按钮、资源卡片、tab 导航、segmented 表单控件、左侧列表、页面布局、预处理流程。
2. 先找基础组件：
   - `UIButton.vue`
   - `UIBlockItem.vue`
   - `UITab.vue`
   - `UITabRadio.vue`
   - `EditorList.vue`
   - `UICard.vue`
3. 再找业务组合组件：
   - `SpriteItem.vue`
   - `BackdropItem.vue`
   - `SoundItem.vue`
   - `WidgetItem.vue`
   - `SpriteEditor.vue`
   - `StageEditor.vue`
   - `StagePanel.vue`
4. 最后再看页面级入口：
   - `ProjectEditor.vue`
   - `EditorPanels.vue`
   - `EditorPreview.vue`
   - `MapEditor.vue`

## What Not To Assume

- 不要假设 `.pen` 组件名和 Vue 文件名相同。
- 不要假设设计稿里的大容器一定有单独的 Vue 文件。
- 不要把 `builder-component.lib.pen` 当成当前代码的完整镜像，它里面有一部分是当前代码已抽象实现的组件，也有一部分更偏概念稿或未来方向。

## Short Conclusion

对于 `builder-component.lib.pen`，当前最稳定的设计到代码映射主线是：

- `Button/*` -> `UIButton.vue`
- `Card/* item*` / `Card/Asset` -> `UIBlockItem.vue` + `UIEditor*Item.vue` + 对应业务 `*Item.vue`
- `Corner marker/*` -> `UICornerIcon.vue` + `CornerMenu.vue`
- `editor-nav-panel` / `editor-panel-*` -> `EditorHeader.vue` + `UITabs.vue` + `SpriteEditor.vue` / `StageEditor.vue`
- `Segmented/*` -> `UITabRadioGroup.vue` + `UITabRadio.vue`
- `left-panel-*` -> `EditorList.vue` + 各类 `*Editor.vue`
- `Card/Edit item/*` -> `PreprocessModal.vue` 及其子流程组件

以后开发者同步设计稿时，优先按“基础组件 -> 业务组合 -> 页面布局”的顺序去定位实现，而不是按设计名字硬找同名文件。
