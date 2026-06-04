# 设计资产命名

> 文档类型：Standard / 命名规范
> 稳定性：通用命名原则长期稳定，Pencil 专属命名可随工具更新
> 适用对象：维护设计资产、组件库、页面文件、图片资源和文档的协作者
> 何时阅读：新增文件、重命名资源、创建组件、整理 Pencil 节点、提交 Design PR 前
> 维护原则：先定义通用命名，再定义当前 Pencil 命名。未来工具替换时，只替换工具专属部分。

## 命名目标

命名的目标不是追求形式统一，而是降低理解成本和交接成本。

一个好的名字应该让协作者知道：

- 这个文件或节点是什么；
- 属于哪个页面、组件或资源类型；
- 是否是稳定资产；
- 是否可以被复用；
- 是否与当前 Issue 或设计系统有关。

## 中英文书写与术语大小写

文档正文中的英文专有名词应使用稳定写法，不随句首、标题或个人习惯随意改变。

推荐固定写法：

```text
Git
GitHub
Figma
Pencil
Issue
PR
Design PR
Demo PR
评审
Reviewer
Commit
Branch
Remote
Assignee
Draft
AI Agent
Design System
Design Token
Auto Layout
Slot
Icon
```

规则：

- 中文与英文、数字之间保留空格，例如「提交 Design PR」「关联 Issue #1234」。
- 文件名、分支名、命令、路径、变量名和 Commit 前缀保持原始大小写，并使用代码样式。
- 作为协作对象或验证材料时，统一写作 `Demo`；作为分支名或 Commit 前缀时，保留 `demo/issue-1234`、`demo:`。
- 作为设计状态值时，使用小写代码样式，例如 `default`、`hover`、`disabled`；作为组件变体段时，使用 PascalCase，例如 `Default`、`Hover`、`Disabled`。
- 如果英文词已经有清晰中文表达，优先使用中文，例如「评审」「分支」「提交」；但在指代 GitHub 或 Git 的固定对象时，保留英文专有名词。

## 先判断命名对象

新增名字前，先判断对象属于哪一类：

| 对象 | 推荐命名方式 |
| ---- | ------------ |
| Markdown 文档 | `kebab-case.zh.md` |
| 页面级 Pencil 文件 | `kebab-case.pen` |
| 组件库 Pencil 文件 | `kebab-case.lib.pen` |
| 图片、图标、字体等资源 | `kebab-case.ext` |
| 可复用组件根节点 | `Category/ComponentName/Variant...` |
| 组件内部结构节点 | `Root`、`Header`、`Content`、`Actions` 等职责词 |
| 可替换内容位 | `Slot/<Role>` |
| 组件示例区 | `Showcase/<Component>/<Purpose>` |
| 设计变量 | 可映射到前端 Token 的稳定变量名 |

## 通用文件命名

文件系统中的文档、Pencil 文件、图片和资源文件统一使用 `kebab-case`。

规则：

- 全部小写；
- 单词之间使用 `-`；
- 不使用空格；
- 不使用中文文件名；
- 不使用大小写混排；
- 不使用 `copy`、`final`、`latest` 等临时词；
- 文件名表达对象语义，不表达个人状态。

示例：

```text
README.zh.md
design-to-validation-workflow.zh.md
design-asset-naming.zh.md
builder-component.lib.pen
community-home.pen
sprite-editor.pen
sprite-card-default.png
add-sprite-item-medium-active.png
```

不推荐：

```text
新文件.pen
sprite editor.pen
sprite_editor.pen
spriteEditor.pen
sprite-editor-copy.pen
sprite-editor-final.pen
sprite-editor-latest.pen
```

## 文档命名

中文文档统一使用：

```text
<topic>.zh.md
```

示例：

```text
design-engineering-onboarding.zh.md
git-collaboration-guide.zh.md
pencil-guidelines.zh.md
issue-template.zh.md
pr-template.zh.md
```

如果未来需要英文版，可以保留同名英文文档：

```text
design-engineering-onboarding.en.md
```

如果仓库只维护中文，也建议保留 `.zh.md`，便于后续扩展。

例外：目录入口文档可以保留约定文件名，例如 `README.zh.md`。它仍然使用 `.zh.md` 表达语言，但不要求改成 `readme.zh.md`。

## 设计资产文件命名

页面级文件使用业务对象或页面语义命名：

```text
community-home.pen
editor-stage.pen
editor-map.pen
asset-panel.pen
sprite-editor.pen
user-tutorial.pen
```

组件库文件使用组件系统或产品域命名：

```text
builder-component.lib.pen
spx-component.lib.pen
```

图片资源应说明对象、尺寸或状态：

```text
sprite-card-medium-default.png
sprite-card-medium-hover.png
asset-panel-empty.png
sound-item-generating.png
```

如果图片属于某个页面或组件，可增加语义前缀：

```text
editor-asset-panel-empty.png
community-project-card-cover.png
```

## 可复用组件根节点命名

可复用组件根节点建议使用稳定层级表达：

```text
Category/ComponentName/Variant...
```

常见组合方式：

```text
Category/ComponentName/Size/State
Category/ComponentName/Size/Type/Style/Shape/State
Category/ComponentName/State
```

规则：

- 使用 `/` 区分层级和变体维度；
- 每一段使用 `PascalCase`；
- 第一段表示组件类别；
- 第二段表示具体组件；
- 后续段表示尺寸、类型、样式、形状、状态等变体维度；
- 如果两个维度可以独立组合，应拆成两个段，不应合并成一个词。

示例：

```text
Card/SpriteItem/Medium/Default
Card/SpriteItem/Medium/Hover
Card/SelectSoundItem/Medium/Default
Nav/TopBar/Default
Button/Medium/White/Stroke/Square/Default
Input/Search/Default
Overlay/Tooltip/Default
```

不推荐：

```text
Card/SpriteItem/MediumDefault
Card/SpriteItem/MediumHover
```

`Medium` 是尺寸，`Default`、`Hover` 是状态。尺寸和状态是两个独立变体维度，合并成 `MediumDefault` 会隐藏组合关系，也不利于后续筛选、复用和评审。因此应写成 `Medium/Default`。

只有当某个词组是不可拆分的业务概念时，才可以保留在同一段中。例如某个组件本身就叫 `ReferencePoint`，不应拆成 `Reference/Point`。

类别建议：

| 类别 | 用途 |
| ---- | ---- |
| `Button` | 按钮类组件 |
| `Input` | 输入类组件 |
| `Card` | 卡片类组件 |
| `Nav` | 导航类组件 |
| `Overlay` | 浮层类组件 |
| `Panel` | 面板类组件 |
| `Modal` | 弹窗类组件 |
| `List` | 列表类组件 |
| `Editor` | 编辑器专属组件 |

## 组件内部节点命名

组件内部节点使用职责词，不使用随意命名。

推荐：

```text
Root
Header
Title
Subtitle
Content
Body
Footer
Actions
Icon
Label
Description
Preview
Thumbnail
Control
Divider
```

不推荐：

```text
Group 1
Group 2
Rectangle 15
Frame copy
新建组
临时
```

内部节点命名不需要过度复杂，但应能让后续维护者理解结构。

## Slot 命名

Slot 用于声明可替换内容位。

格式：

```text
Slot/<Role>
```

示例：

```text
Slot/Icon
Slot/Title
Slot/Description
Slot/Thumbnail
Slot/Actions
Slot/Preview
Slot/Content
```

Slot 名称应表达角色，而不是表达具体内容。

推荐：

```text
Slot/Thumbnail
```

不推荐：

```text
Slot/KikoImage
Slot/ThisIcon
Slot/TempContent
```

## 组件示例区命名

组件库中如果需要摆放示例、状态组合或说明内容，可以使用 Showcase 命名。

格式：

```text
Showcase/<Component>/<Purpose>
```

示例：

```text
Showcase/SpriteItem/AllStates
Showcase/Button/SizeAndState
Showcase/AssetPanel/EmptyAndLoading
```

Showcase 节点用于说明，不作为真实组件 API 被页面引用。

## 设计变量命名

设计变量应尽量与前端 Token 对齐，避免使用只对设计工具有意义的临时名称。

推荐方向：

```text
color.text.primary
color.text.secondary
color.background.canvas
color.background.surface
color.border.default
radius.card
spacing.8
spacing.12
shadow.panel
```

不推荐：

```text
blue1
newColor
color-copy
my-shadow
临时阴影
```

变量命名应稳定、可复用、可映射。

## 状态命名

状态命名分为两种场景。

第一种是设计状态值，建议使用小写代码样式：

```text
default
hover
focus
active
selected
disabled
loading
empty
error
success
generating
collapsed
expanded
```

第二种是组件变体段，建议使用 `PascalCase`：

```text
Default
Hover
Focus
Active
Selected
Disabled
Loading
Empty
Error
Success
Generating
Collapsed
Expanded
```

组件变体中可组合使用：

```text
Card/SpriteItem/Medium/Default
Card/SpriteItem/Medium/Hover
Panel/AssetPanel/Collapsed
Panel/AssetPanel/Expanded
```

如果状态与尺寸、类型、样式等维度同时存在，应使用 `/` 拆分独立维度，不应把多个维度合并成一个词。

## 分支命名

虽然本文主要约束设计资产命名，但为了保持追溯一致，工作分支也建议保留 Issue 编号。

```text
design/issue-1234-asset-panel
demo/issue-1234-asset-panel
docs/issue-1234-workflow-guide
fix/issue-1234-sprite-name
```

## 重命名规则

重命名前应确认：

- 是否被其他页面引用；
- 是否影响组件库；
- 是否影响资源路径；
- 是否会导致 `.pen` 文件丢失引用；
- 是否需要在 PR 中说明迁移关系。

重命名后应检查：

```bash
git status --short
```

并在 PR 中说明：

- 旧名称；
- 新名称；
- 重命名原因；
- 是否影响引用关系。

## PR 中的命名自查

提交 Design PR 前，检查：

- [ ] 新增文件是否使用 `kebab-case`。
- [ ] 中文文档是否使用 `.zh.md`。
- [ ] Pencil 文件名是否表达页面、组件库或业务对象。
- [ ] 图片资源是否能看出所属对象和状态。
- [ ] 组件根节点是否符合 `Category/ComponentName/Variant...`。
- [ ] 内部节点是否使用职责词。
- [ ] Slot 是否使用 `Slot/<Role>`。
- [ ] 没有出现 `copy`、`final`、`latest`、`test` 等临时命名。
