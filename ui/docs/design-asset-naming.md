# 设计资产命名（Design Asset Naming）

本文统一约束四类对象：

- 文件系统资源命名
- `ui/components/spx/builder-component.lib.pen` 设计节点命名
- `builder-component.lib.pen` 变量命名
- `ui/pages/**/*.pen` 页面文件的组件库引用方式

目标不是追求“名字好看”，而是保证以下几点：

- 新增节点时可以快速决定该怎么命名
- 组件、结构、插槽、展示区不再混用命名方式
- 后续批量检索、迁移、自动化校验都有稳定边界

## 1. `ui/docs` 与 `ui/images`

`ui/docs` 与 `ui/images` 面向文件系统、路径和资源引用，统一使用 `kebab-case`。

规则：

- 全部小写
- 单词之间使用 `-`
- 不使用空格、下划线或大小写混排
- 适用于文档目录、文档文件、图片资源名和图片引用路径
- 面向中文叙事的规范文档优先使用 `.zh.md` 后缀，并在标题中使用「中文（English）」格式
- 模板、清单、校验说明和命名规则可保留 `.md` 作为稳定引用入口；如后续拆分多语言版本，应同步更新 README 索引和所有交叉引用

示例：

```text
design-asset-naming.md
sprite-card-default.png
add-sprite-item-medium-active.png
card-widget-item-medium-hover.png
```

说明：

- `kebab-case` 只用于文件系统资源
- 不直接拿来命名 `.pen` 里的组件 API 节点

## 2. `builder-component.lib.pen` 的命名分层

`builder-component.lib.pen` 内的节点不要再按同一套规则硬套。必须先判断节点属于哪一类，再决定命名方式。

设计节点统一分成 5 类：

1. 可复用组件节点
2. 结构布局节点
3. Slot 节点
4. 文档/展示节点
5. Icon / Logo primitive 节点

---

## 3. 可复用组件节点

适用范围：

- `reusable: true` 的组件根节点
- 对外会被引用、复用、映射、文档展示的组件节点

统一使用 `/` 分层命名。

推荐格式：

```text
Category/ComponentName/VariantOrState
```

规则：

- 使用 `/` 区分层级
- 每一段使用 `PascalCase`
- 第 1 段表示组件类别，例如 `Card`、`Nav`、`Input`、`Overlay`
- 第 2 段表示具体组件语义，例如 `SpriteItem`、`TopBar`、`Switch`、`Tooltip`
- 后续段表示尺寸、语义分组、状态或变体组合，例如 `MediumDefault`、`Default`、`Hover`, `MultiPage`
- 不把每个单词都拆成独立层级
- 允许组件族为了和代码 props 词表对齐使用 4-5 段，但每一段仍必须有稳定语义

示例：

```text
Card/SpriteItem/MediumDefault
Card/AddSpriteItem/MediumActiveNoBg
Card/SelectSoundItem/MediumHover
Card/WidgetItem/MediumCornerMenu
GenItem/Costume/HoverNotGen
Nav/TopBar/Default
Input/Switch/Default
Overlay/Tooltip/Default
Code/Line/Default
Button/IconOnly/MediumPrimaryStrokeCircleDefault
Button/Medium/White/Stroke/Square/Default
```

旧名称迁移示例：

```text
card-select-sound-item-medium-active
=> Card/SelectSoundItem/MediumActive

genitem-costume-hover-not-gen
=> GenItem/Costume/HoverNotGen

pagination-item-default
=> Pagination/Item/Default

Logo/App/LogIn
=> Logo/App/Login
```

补充约束：

- 组件名表达“组件 API 是什么”，不表达它内部如何布局
- 不把 `Frame`、`Container`、`Text` 之类结构词塞进组件根节点名
- 不在组件根节点上使用 kebab-case、中文、随机编号、Figma 默认名
- 对于 button 组件族，优先使用 `Button/<Size>/<Variant>/<Style>/<Shape>/<State>` 或既有 `Button/IconOnly/<VariantState>` 词表，不新增 `button-*` kebab-case

---

## 4. 结构布局节点

适用范围：

- 组件内部的 `frame`
- 不对外复用、只承担布局职责的节点

结构节点不使用完整组件式分层命名，而使用短而稳定的职责词。

原则：

- 优先表达职责，不表达视觉形状
- 优先表达语义，不表达绘图工具残留
- 名字尽量短
- 同一组件内部使用同一抽象层级

推荐词表：

```text
Root
Leading
Trailing
Content
Actions
Label
LabelGroup
Icon
IconAction
PrimaryAction
Divider
Header
Body
Footer
Info
Avatar
Tabs
Panel
Surface
Field
```

迁移示例：

```text
Frame
=> Root

Container
=> Content

Text and Icon Container
=> LabelGroup

左
=> Leading

右
=> Trailing

line
=> Divider

nav-actions-group
=> Actions

User Avatar
=> Avatar
```

禁止项：

- `Frame`
- `Container`
- `Text`
- `左`
- `右`
- `line`
- `Group 123`
- `Rectangle 123`

只有在非常明确需要区分职责时，才允许在推荐词表基础上细化，例如：

```text
PrimaryAction
IconAction
LabelGroup
```

---

## 5. Slot 节点

适用范围：

- 组件的可替换内容位
- 未来新增的 slot、layout 插槽、组合插槽

Slot 是组件接口，不是普通容器。

命名要求：

- 名字表达“这里允许替换什么”
- 不表达绘图位置
- 优先语义词，不优先方位词

推荐格式：

```text
Slot/<SemanticRole>
```

推荐角色：

```text
Slot/Icon
Slot/Label
Slot/Content
Slot/Action
Slot/Media
Slot/Leading
Slot/Trailing
```

说明：

- `Leading` / `Trailing` 优于 `Left` / `Right`
- 一个组件内部的 slot 抽象层级必须一致
- 不要混用 `IconSlot`、`TopRightButtonArea`、`LeftContent` 这种不同风格

如果后续全库决定改成后缀风格，也只能统一切成一种，例如：

```text
IconSlot
ContentSlot
ActionSlot
```

在未统一前，默认使用 `Slot/<Role>`。

---

## 6. 文档/展示节点

适用范围：

- 组件库里的展示区、样例区、分组区
- 不作为组件 API 的画板和示例容器

统一格式：

```text
Docs/<Section>/<Purpose>
```

示例：

```text
Docs/Pagination
Docs/Pagination/Showcase
Docs/Tooltip
Docs/Tooltip/Showcase
Docs/Icons/SlotShowcase
Docs/Tabs/Combined
```

说明：

- 展示区命名必须和真实组件根节点区分开
- 不要再出现外层展示组和可复用组件同名，例如同时都叫 `Pagination`

---

## 7. Icon / Logo primitive 节点

适用范围：

- 图标容器
- Logo 内部 primitive
- 基础图元包装节点

规则：

- 拼写必须正确
- 不保留 Figma 默认 primitive 名
- 尽量表达图元职责

示例：

```text
icon/langurage
=> icon/language

icon/pubilsh-colorful
=> icon/publish-colorful

union1
=> Wordmark

union
=> Glyph
```

说明：

- 当前库里保留 `icon/...` 这类命名是可以接受的
- 如果未来要进一步统一 icon 体系，可以升级成 `Icon/Language`、`Icon/Publish/Colorful`
- 在没有全量迁移计划前，不强制一步到位

---

## 8. 判断流程

新增节点命名时，先问 4 个问题：

1. 这是文件资源，还是 `.pen` 设计节点？
2. 这是组件 API，还是内部结构？
3. 这是 slot，还是普通布局容器？
4. 这是展示区，还是实际可复用组件？

对应规则：

- 文件资源：`kebab-case`
- 可复用组件：`Category/ComponentName/Variant`
- 内部结构：职责词
- Slot：`Slot/<Role>`
- 文档/展示：`Docs/<Section>/<Purpose>`
- Icon / primitive：保留语义名，清理拼写和 Figma 默认名

---

## 9. 变量命名

适用范围：

- `ui/components/spx/builder-component.lib.pen` 内定义的 design token
- 供组件库内部或页面引用的颜色、圆角、间距、阴影、字体行高等变量

规则：

- 组件库变量只在 `builder-component.lib.pen` 定义
- 页面 `.pen` 不保留本地 `themes`、`variables`、`fonts` 快照
- 组件库当前只保留本地 theme 轴；不要保留 `j:Accent`、`m:Accent`、`2:Accent` 这类页面 import alias theme
- 变量名使用稳定 token 前缀，例如 `grey*`、`turquoise*`、`space-*`、`radius-*`、`border-radius-*`、`shadow-*`、`line-height-*`、`mask-*`
- 不新增语义不明的 `number-*` 变量；历史变量如无引用，应在确认影响后清理
- 允许不同 token 在数值上相同，但语义必须不同，例如 `radius-2` 与 `border-radius-1` 都可能是 `8`

示例：

```text
grey500
turquoise300
space-3
radius-2
border-radius-1
shadow-surface-color
shadow-surface-blur
line-height-3
mask-2
```

---

## 10. 页面 `.pen` 引用规则

适用范围：

- `ui/pages/**/*.pen`

规则：

- 每个活跃页面 `.pen` 必须通过 `imports` 引用 `../components/spx/builder-component.lib.pen`
- 页面只保留页面结构和组件实例，不保留从组件库复制出来的本地 token、字体或主题
- 页面里引用组件库变量或组件时必须使用 import alias 作用域，例如 `$a:grey300` 或 `a:<reusable-id>`
- 页面 `.pen` 的 `themes`、`variables`、`fonts` 预期为空或不存在
- 修改组件库或引用组件库的页面后，按 [设计资产校验（Design Asset Validation）](./design-asset-validation.md) 执行自查或校验。

---

## 11. 新增节点前的自检清单

新增名字前，至少检查以下 6 项：

- 这个名字是否说明“它做什么”，而不是“它长什么样”
- 这个名字是否属于正确层级：组件 / 结构 / slot / docs / primitive
- 是否误用了 `Frame`、`Container`、`Text` 等空泛词
- 是否误把文件资源风格 `kebab-case` 用到了组件 API
- 是否存在拼写错误
- 是否和现有同类节点风格一致
- 页面 `.pen` 是否只引用组件库，而不是复制组件库变量

如果其中任意一项答不上来，先不要落库，先归类。
