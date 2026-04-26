# Design to Code Mapping Guide

本文记录整个仓库里 `.pen` 设计资产与 `spx-gui` 前端实现之间的对应关系，供后续开发者同步设计稿到代码时使用。

人工操作难免存在错误，因此本文不仅是说明文档，也是 AI 在 `ui/**` 范围内进行规范化修正的执行依据：当活跃设计文件与代码主源之间有冲突时，应优先阅读本文，并把 `ui/**` 下目标文件改到符合规范；`spx-gui/src/**` 默认只作为对照主源，不直接修改。

## Scope

- 设计定义库：`ui/components/spx/builder-component.lib.pen`
- 页面设计层：`ui/pages/spx/*.pen`
- 前端代码库：`spx-gui/src`
- 历史快照：`ui/components/spx/.snapshots/*.pen`（仅归档，不参与主源判定）
- 技术栈：Vue 3 + TypeScript

最重要的结论有两条：

1. `builder-component.lib.pen` 和 `spx-gui/src/components/ui` 定位不同。
   - `builder-component.lib.pen` 更偏「设计定义层」
   - `spx-gui/src/components/ui` 更偏「代码实现层」
2. 只要是“同一份基础 token / 同一类组件参数 / 同一组状态名”，一律以 `spx-gui/src/components/ui` 为准，`.pen` 向其靠拢。

`builder-component.lib.pen` 不是“一个设计组件 = 一个 Vue 文件”的映射关系。它更像是一个设计组件库，前端代码通常拆成三层：

1. 视觉基础组件：`spx-gui/src/components/ui/**`
2. 编辑器业务组件：`spx-gui/src/components/editor/**`
3. 页面级布局入口：`spx-gui/src/pages/editor/index.vue`

后续同步设计稿时，先判断变更属于哪一层，再改代码，不要只按设计组件名字在代码里做同名搜索。

## AI Normalization Contract

为了让 AI 能稳定地“读完文档再改文件”，本文中的规则应按下面方式理解和执行。

### Goal

AI 的目标不是保留历史写法，而是把活跃文件收口到当前规范：

1. 同一份基础 token，以 `spx-gui/src/components/ui/tokens/*` 和 `UIConfigProvider.vue` 为准。
2. 同一类组件参数、状态名、字体基线，以 `spx-gui/src/components/ui/**` 为准。
3. `builder-component.lib.pen` 对齐代码主源。
4. `ui/pages/spx/*.pen` 优先引用 `builder-component.lib.pen`，只保留必要的页面私有变量。

### Allowed Targets

AI 默认只应修正这些活跃文件：

- `ui/components/spx/builder-component.lib.pen`
- `ui/pages/spx/*.pen`
- `ui/**` 下与上述规则直接相关的文档
- `ui/**` 下与上述规则直接相关的辅助设计文件

AI 默认不应修改这些文件，除非用户明确要求：

- `spx-gui/src/**`（包括 `spx-gui/src/components/ui/**`，默认只作为对照主源）
- `ui/components/spx/.snapshots/*.pen`
- 纯历史材料、归档页面、实验性草稿
- 与当前规则无关的业务文件

### Execution Order

当 AI 要修正某个文件时，按这个顺序执行：

1. 先判断目标文件属于“代码主源 / 设计组件库 / 页面设计文件”哪一层。
2. 再判断问题属于“基础 token / 组件参数词表 / 状态名 / Typography / import alias / 页面局部变量”哪一类。
3. 先对齐主源，再回收平行命名、局部副本、历史残留。
4. 只做最小必要修改，不顺手重写无关结构。
5. 修改后必须给出本次应用了哪些规则、改了哪些文件、如何验证。

### Normative Rules For AI

下面这些规则，AI 应按 `MUST` / `SHOULD` / `MUST NOT` 执行：

- `MUST` 把 `spx-gui/src/components/ui/tokens/*`、`UIConfigProvider.vue`、`spx-gui/src/components/ui/**` 视为共享基础规范主源，但默认按只读依据处理。
- `MUST` 把 `builder-component.lib.pen` 视为设计组件库，而不是代码主源。
- `MUST` 把 `ui/pages/spx/*.pen` 视为页面拼装层，而不是基础 token 主源。
- `MUST` 在未获用户明确授权时，把默认写入范围限制在 `ui/**`，不要直接修改 `spx-gui/src/**`。
- `MUST` 在 `builder-component.lib.pen` 内部使用本地 token 和本地 `ref`，例如 `$grey300`、`$space-3`、`"ref": "<本地 reusable 节点 ID>"`。
- `MUST` 在页面 `.pen` 中优先通过 import alias 使用组件库 token / 节点，例如 `$r:grey300`、`$r:space-3`、`"ref": "r:<组件库 reusable 节点 ID>"`。
- `MUST` 在修改 `builder-component.lib.pen` 或任何引用它的活跃页面 `.pen` 后，在仓库根目录运行 `npm --prefix spx-gui run test -- src/utils/builder-component-lib.test.ts --run`，并汇报结果。
- `MUST` 在任务目标属于“修改 canonical palette”时，先得到用户对 `spx-gui/src/components/ui/tokens/colors.ts` 的明确授权；未获授权时，只能把 `ui/**` 同步到当前代码主源。
- `MUST` 删除仅仅复制基础 token 的页面局部变量，只要这些值已经可以从组件库 import 得到。
- `SHOULD` 保留组件库中不存在、且确实属于页面语义的私有变量，例如页面专用尺寸、布局常量、临时内容占位。
- `MUST NOT` 新增 `2:*`、`m:*` 这类历史 token 命名空间作为新的基础规范。
- `MUST NOT` 把 import alias 误判成 token 命名空间本体。
- `MUST NOT` 修改 `.snapshots` 历史快照来伪造“已对齐”结果。

### Expected Output From AI

AI 在完成修正后，回复里至少应说明：

1. 目标文件属于哪一层。
2. 本次依据了哪些主源文件。
3. 发现了哪些不符合规范的点。
4. 做了哪些最小修正。
5. 跑了哪些验证；如果没跑，要明确说明。

### Recommended Prompt Pattern

如果希望 AI 直接按本文修正文件，推荐用这种指令方式：

```text
请先阅读 ui/docs/design-to-code-mapping.md。
然后检查并修正 <target-file>，把它改到符合文档规范。
要求：
1. 先判断它属于代码主源、设计组件库，还是页面设计文件。
2. 明确指出冲突的是 token、组件词表、状态名、Typography，还是 import alias / 页面局部变量。
3. 只做最小必要修改，默认只改 `ui/**`，不改历史快照，不改无关文件。
4. 修改后说明你依据了哪些主源文件，并给出验证结果。
```

### Verification Commands

当目标文件是 `builder-component.lib.pen` 或任何引用它的活跃页面 `.pen` 时，默认使用下面这条命令做手动校验：

```bash
npm --prefix spx-gui run test -- src/utils/builder-component-lib.test.ts --run
```

如果希望同时触发“创建 `.snapshots` 快照 + staged 校验”，可在 `builder-component.lib.pen` 已暂存时运行：

```bash
npm --prefix spx-gui run validate:pen
```

注意：

- `validate:pen` 现在会在任意 staged `ui/**/*.pen` 存在时触发。
- 只有当 `ui/components/spx/builder-component.lib.pen` 已被 `git add` 时，`validate:pen` 才会额外创建 `.snapshots` 备份。
- 如果只改了文档而没改 `.pen`，可以不跑这条测试，但回复里要明确说明未跑。

## Source Of Truth

| 层级 | 主文件 | 职责 | 是否主源 |
|------|--------|------|----------|
| 代码基础 token | `spx-gui/src/components/ui/tokens/colors.ts`、`spx-gui/src/components/ui/tokens/index.ts`、`spx-gui/src/components/ui/UIConfigProvider.vue` | 定义颜色、圆角、间距、阴影、基础字体和运行时 CSS 变量 | 是 |
| 代码组件出口 | `spx-gui/src/components/ui/index.ts` | 定义当前真正对外可用的 UI 组件覆盖面 | 是 |
| 设计组件库 | `ui/components/spx/builder-component.lib.pen` | 定义设计资产、状态矩阵、组件族和页面可复用设计节点 | 否，需对齐代码主源 |
| 页面设计文件 | `ui/pages/spx/*.pen` | 组织页面、拼装组件、局部演示页面变量 | 否，不能作为基础规范主源 |

仓库里当前存在三种设计到代码链接方式：

1. 基础 token 链接：`tokens/*.ts` -> `UIConfigProvider.vue` 输出的 `--ui-*` -> `.pen` 变量
2. 组件链接：`.pen` 组件族 -> `spx-gui/src/components/ui/**` 基础组件 -> `spx-gui/src/components/editor/**` 业务组合
3. 页面链接：`ui/pages/spx/*.pen` -> `spx-gui/src/pages/**` 或页面级业务组件

## Repo-Wide Inventory

做全仓库检索后，当前“活跃输入”可以分成四类：

| 类别 | 文件/范围 | 当前状态 | 说明 |
|------|-----------|----------|------|
| 代码 token 主源 | `spx-gui/src/components/ui/tokens/colors.ts`、`tokens/index.ts`、`UIConfigProvider.vue` | 活跃 | 颜色、圆角、间距、阴影、字体和 `--ui-*` 运行时变量都以这里为准 |
| 代码组件出口 | `spx-gui/src/components/ui/index.ts` | 活跃 | 当前约 50 条导出语句，包含基础组件、组合组件和若干 `export *` 聚合入口 |
| 设计组件库 | `ui/components/spx/builder-component.lib.pen` | 活跃 | 当前主题已收敛到 `Mode` + `Accent`，包含 103 个变量、约 640 个 reusable 资产 |
| 页面 `.pen` | `ui/pages/spx/*.pen` | 活跃，但只作页面快照 | 大多带有局部变量复制、import alias 或 `--ui-*` 镜像，不应反向定义基础规范 |

当前 `builder-component.lib.pen` 的高频组件族主要是：

- `Button`: 44
- `Corner marker`: 27
- `Tag`: 20
- `Card`: 18
- `SearchBox`: 15
- `Segmented`: 15
- `Input`: 11
- `CombinationTab`: 9

页面 `.pen` 的变量分布也有明显分层：

- `community-home.pen`、`community-login.pen`、`community-project.pen`、`community-user.pen`、`community-search.pen`、`community-explore.pen` 主要是社区页局部 token 快照
- `editor-map.pen`、`editor-stage.pen`、`editor-sprite.pen` 主要是编辑器页 `--ui-*` 镜像和带前缀的局部 token
- `tutorial.pen` 只有少量页面级灰阶变量
- `ui/components/spx/.snapshots/*.pen` 仍保留 `2:Accent`、`m:Accent` 等历史命名，仅用于回看历史，不参与当前对齐

## Foundation Token Mapping

| 类别 | 代码主源 | `.pen` 对应层 | 当前状态 | 对齐规则 |
|------|----------|---------------|----------|----------|
| Color | `tokens/colors.ts` | `builder-component.lib.pen` 的 `grey*` / `turquoise*` / `yellow*` / `blue*` / `red*` / `green*` / `purple*` | 组件库层已对齐；页面层有局部复制和漂移 | 同名颜色必须同值，语义色以代码命名为准 |
| Radius | `tokens/index.ts` 的 `radius` / `borderRadius` | `builder-component.lib.pen` 的 `radius-*` / `border-radius-*` | 组件库层已对齐 | 保持 `radius-*` 与 `border-radius-*` 两套命名，不再新增平行词 |
| Space / Gap | `tokens/index.ts` 的 `space` / `gap` | `builder-component.lib.pen` 的 `space-*` | 组件库层已对齐；页面层仍有局部快照 | 设计层继续用 `space-*`，代码层允许额外暴露语义别名 `gap-*` |
| Shadow / Elevation | `tokens/index.ts` 的 `boxShadow` | `builder-component.lib.pen` 的 `shadow-panel` / `shadow-surface` / `shadow-surface-strong` / `shadow-accent` / `shadow-subtle` | 已对齐，且仓库已有自动校验 | 统一使用具名阴影，不再回退到匿名 literal |
| Typography | `tokens/index.ts` 的 `fontFamily` / `fontSize` + `UIConfigProvider.vue` 的 `h1-h6` + 组件内字号实现（如 `UIButton.vue`、`UITag.vue`） | `builder-component.lib.pen` 的 `H1-H6` 与局部文字样式 | 标题层级已基本对齐；默认字体仍有漂移 | 活跃设计默认字体当前应视为 `SourceHanSansSC-VF`；代码侧若仍出现 `AlibabaHealthB`，应视为待收敛残留，而不是新的设计主源 |
| CSS Variable Mirror | `UIConfigProvider.vue` 通过 `getCssVars('--ui-', uiVariables)` 输出 `--ui-*` | `ui/pages/spx/*.pen` 中的 `--ui-*` 或 `a:--ui-*` / `W:--ui-*` 镜像变量 | 存在，但不是主源 | 页面局部 `--ui-*` 只能视作快照或演示，不能反向覆盖代码 token |

### Canonical Color Token Snapshot

`ui/docs/**` 中凡是需要引用颜色 token 数值时，统一按下面这份快照书写：

| 颜色族 | 规范值 |
|--------|--------|
| `grey` | `1000 #24292F`、`900 #57606A`、`800 #6E7781`、`700 #A7B1BB`、`600 #CBD2D8`、`500 #D9DFE5`、`400 #EAEFF3`、`300 #F6F8FA`、`200 #FBFCFD`、`100 #FFFFFF` |
| `turquoise` | `700 #20747C`、`600 #2B9BA5`、`500 #36C2CF`、`400 #3FCDD9`、`300 #AFE7EC`、`200 #EAF9FA`、`100 #F3FBFC` |
| `yellow` | `700 #9D611F`、`600 #CE8029`、`500 #FF9F33`、`400 #FFC584`、`300 #FFE2C2`、`200 #FFF1E2`、`100 #FFF8F1` |
| `purple` | `700 #7252B5`、`600 #926AE8`、`500 #A074FF`、`400 #B390FF`、`300 #E2D4FF`、`200 #F6F1FF`、`100 #FAF8FF` |
| `blue` | `700 #0076CE`、`600 #0693F1`、`500 #4CB8FF`、`400 #78C7FF`、`300 #B8E0FF`、`200 #DFEFFF`、`100 #EFF7FF` |
| `red` | `600 #BC292E`、`500 #EF4149`、`400 #F15D64`、`300 #FF97A0`、`200 #FDC7C7`、`100 #FEEFEF` |
| `green` | `600 #3CA80C`、`500 #63CE29`、`400 #90E05A`、`300 #B0EA90`、`200 #CBF1CD`、`100 #E0F8E3` |

补充约束：

- 这张表是 `ui/docs/**` 当前记录的设计侧目标值。
- 如果 `spx-gui/src/components/ui/tokens/colors.ts` 还没同步到同一组值，不能把“文档已更新”误判成“代码已落地”。
- 代码、组件库、页面镜像要继续按本文 `Batch Token Change Workflow` 逐层收敛。

### Page-Level Token Mirrors Are Not Canonical

把范围扩大到整个仓库后，可以确认真正有漂移的是页面 `.pen` 文件里的局部变量快照，而不是 `builder-component.lib.pen` 的核心 token。

活跃页面文件里最典型的漂移如下：

| 文件 | 现象 | 例子 | 结论 |
|------|------|------|------|
| `ui/pages/spx/editor-map.pen` | 直接复制 `--ui-*` 和基础色 | `turquoise600 = #0AA5BE`，而代码主源是 `#2B9BA5` | 页面镜像，不能作为基础 token 主源 |
| `ui/pages/spx/editor-stage.pen` | 既有 `a:*` 前缀快照，也有无前缀局部色值 | `a:--ui-color-sound-main = #A074FF`，而当前目标 `sound.main` 应为 `#4CB8FF`；`a:turquoise700 = #0B8893`，目标 `turquoise700` 是 `#20747C` | 设计稿里混入了历史主题快照，需按目标值回收 |
| `ui/pages/spx/community-login.pen` | 社区页局部色板复制 | `turquoise500 = #0BC0CF`，代码主源是 `#36C2CF` | 页面局部 copy，需回归代码 token |
| `ui/pages/spx/community-project.pen` | 有局部 token + import alias 叠加 | `turquoise700 = #0B8893`，同时又有 `m:` / `r:` import alias | 需要区分“本地变量”与“导入引用” |
| `ui/pages/spx/community-user.pen` | 有局部 token + import alias 叠加 | `turquoise700 = #0B8893`，并保留 `r:turquoise500` | 需要区分“本地变量”与“导入引用” |
| `ui/pages/spx/community-home.pen` | 当前值大体已对齐，但仍是页面内复制 | `space-1/3/4/5`、`border-radius-1`、`turquoise200` 都是本地镜像 | 可以保留页面快照，但不能反向定义基础规范 |
| `ui/pages/spx/community-explore.pen` | 变量量少，但仍带 import alias `2` | `radius-4 = 12`，同时页面用 `2:...` 引用组件库 | `2:` 在这里是 import alias，不是基础 token 命名空间 |

这说明后续建立链接时，必须明确区分：

- `builder-component.lib.pen` 是设计组件库
- `ui/pages/spx/*.pen` 里大量局部变量只是页面快照
- 真正的基础 token 主源仍是 `spx-gui/src/components/ui/tokens/*`

### Import Alias Usage By Layer

`$r:*`、`$t:*`、`2:*` 这类写法只在“引用别的 `.pen` 文件”时成立。它们不是基础 token 命名空间，而是当前文件给 import 起的 alias。

| 层级 | 推荐写法 | 不推荐写法 | 说明 |
|------|----------|------------|------|
| `ui/components/spx/builder-component.lib.pen` | `$grey300`、`$space-3`、`"ref": "<本地 reusable 节点 ID>"` | `$r:grey300`、`$r:space-3`、`"ref": "r:<组件库 reusable 节点 ID>"` | 组件库是被引用方，内部只使用自己的本地变量和本地 reusable 节点 ID |
| `ui/pages/spx/*.pen` 引用组件库 | `$r:grey300`、`$r:space-3`、`"ref": "r:<组件库 reusable 节点 ID>"` | 把基础 token 再复制成页面本地 `$grey300`、`$space-3` | 页面是引用方，应该优先通过 import alias 直接读取组件库 token / 节点 |
| `ui/pages/spx/*.pen` 页面私有变量 | `$hero-banner-height`、`$search-result-gap` | 用页面本地变量重定义 `grey300`、`space-3`、`border-radius-1` | 只有组件库里没有的页面特有值，才适合留在页面本地 `variables` |

这里的 `<本地 reusable 节点 ID>` 只是占位写法。当前 `builder-component.lib.pen` 里确实存在一个 ID 为 `OHwu4`、名称为 `H2` 的本地 reusable 文本节点，但它只是当前文件里的一个真实示例，不是规范要求里必须固定写成 `OHwu4`。

典型写法如下：

库内新增组件时，直接使用组件库自己的变量和 ref：

```json
{
  "fill": "$grey300",
  "gap": "$space-3",
  "children": [
    {
      "type": "ref",
      "ref": "<local-reusable-id>"
    }
  ]
}
```

页面消费组件库时，先声明 import alias，再通过 alias 引用：

```json
{
  "imports": {
    "r": "../../components/spx/builder-component.lib.pen"
  },
  "fill": "$r:grey300",
  "gap": "$r:space-3",
  "children": [
    {
      "type": "ref",
      "ref": "r:<library-reusable-id>"
    }
  ]
}
```

`r`、`t`、`2`、`m` 都只是 alias 名，本身没有语义。规范重点不是“必须叫 `r`”，而是“组件库内部不用 alias，页面引用组件库时统一通过 alias 取值”。

## Current Alignment Gaps In Pen

当前最需要持续关注的不是值表本身，而是页面快照与组件库边界：

- 历史命名空间残留：
  - 活跃的 `builder-component.lib.pen` 已收敛到 `Mode` + `Accent`，不再保留 `2:*` / `m:*` token
  - 当前仓库里仍能看到 `2:`、`m:`、`r:`、`a:`、`W:` 这类前缀，但多数出现在页面 import alias、页面局部镜像或 `.snapshots` 历史快照里
  - 这些前缀可以用于 import alias，但不应继续充当基础 token 主命名空间
- Typography 与组件词表：
  - 活跃设计默认字体应按 `SourceHanSansSC-VF` + `H1-H6` 理解
  - `spx-gui` 代码侧当前仍能看到 `AlibabaHealthB` 和对应字体文件残留，这不应被 AI 当作新的设计基线
  - Button / Input / SearchBox / Tag 已按 `UIButton.vue`、`UITextInput.vue`、`UITag.vue` 的词表更新命名
  - 历史页面快照、`.snapshots` 和页面局部说明文字里仍可能出现旧词，应优先判断它是不是历史材料而不是活跃规范
- 页面局部别名前缀过多：
  - `a:*`、`W:*`、`2:*`、`m:*`、`r:*`
  - 这些可以用于 import alias，但不应继续当作 token 语义名的一部分

## Automated Links Already In Repo

仓库已经有一部分“设计到代码”自动校验，集中在：

- `spx-gui/src/utils/builder-component-lib.test.ts`

当前已覆盖：

- `builder-component.lib.pen` 不再 import 其他 pen 库
- `builder-component.lib.pen` 内不允许出现 aliased token / aliased ref
- `turquoise`、`yellow`、`blue`、`red`、radius、space、shadow 与代码 token 保持同步
- 部分组件阴影已经迁移到具名 token：`panel` / `surface` / `surfaceStrong`
- 组件库里不再允许若干可 token 化的硬编码半径和间距 literal
- 活跃页面 `.pen` 必须保留对组件库的 import alias，且不能再定义本地 `variables` / `fonts`
- 活跃页面 `.pen` 不能复制本地 `text` / `path` 资产

当前未覆盖：

- `green`、`purple` 目前还没有像 `turquoise` 那样的专门 palette 等值断言
- 页面局部镜像变量的“设计语义是否合理”仍需要人工判断
- 组件词表是否完全对齐代码 props

## Coverage Snapshot

| 设计组件族 | `.pen` 覆盖 | 代码实现 | 链接状态 | 备注 |
|-----------|------------|----------|----------|------|
| Button | `builder-component.lib.pen` 中约 44 个可复用节点 | `UIButton.vue` | 中高 | 代码 props 已稳定为 `color/size/variant/shape`，但 `.pen` 命名仍混有旧词表 |
| Switch | `Switch` + 6 个状态节点 | `UISwitch.vue` | 低 | `.pen` 状态完整，代码仍是薄封装，且标注 `TODO: switch style not designed yet` |
| Tooltip | `Tooltip` + 上下左右 4 向 | `UITooltip.vue` | 高 | 方向语义可直接映射到 `placement` |
| Segmented | 15 个节点 | `UITabRadioGroup.vue` + `UITabRadio.vue` | 中 | 设计语义与代码可连通，但 `.pen` 里仍混有 `Tab` / `Segmented` 双词表 |
| Tabs / CombinationTab | 9 个节点 | `UITabs.vue` + `UITab.vue` | 中 | 需继续区分“页面级 tab”与“表单 segmented” |
| Tag | 20 个节点 | `UITag.vue` | 中低 | 设计覆盖比代码更大，代码目前只有 `size='small'`，颜色词表是 `default/primary/warning/error` |
| Input / SearchBox | 11 + 15 个节点 | `UITextInput.vue` | 中低 | 有明显映射，但代码当前只有 `color='default'|'white'`、`size='medium'|'large'` |
| Pagination | `Pagination` 族 | `UIPagination.vue` | 中 | 设计是静态状态展示，代码是聚合逻辑组件 |
| Chip | 设计层未形成稳定主族 | `UIChip.vue` | 低 | 代码已明确标注“暂无官方 UI 规范支持” |

## Mapping Rules

### 1. `button-*` 先看 `UIButton.vue`

设计库中的按钮族基本都落在同一个基础组件：

- 代码入口：`spx-gui/src/components/ui/UIButton.vue`
- 预览页：`spx-gui/src/pages/docs/ui-design.vue`

按钮在 design-to-code 的目标规范里，应该统一使用两套路径式模板：

- 文本按钮：`Button/{Size}/{Color}/{Variant}/{Shape}/{State}`
- 纯图标按钮：`Button-only icon/{Size}/{Color}/{Variant}/{Shape}/{State}`

其中各字段含义如下：

| 字段 | 含义 | 建议值 | 代码 props |
|------|------|--------|------------|
| `Size` | 尺寸档位 | `Small` / `Medium` / `Large` | `size` |
| `Color` | 颜色语义、按钮层级 | `Primary` / `Secondary` / `Boring` / `White` / `Danger` / `Success` / `Blue` / `Purple` / `Yellow` | `color` |
| `Variant` | 视觉样式 | `Shadow` / `Flat` / `Stroke` | `variant` |
| `Shape` | 外形 | `Square` / `Circle` | `shape` |
| `State` | 交互状态 | `Default` / `Hover` / `Click` / `Focus` / `Disabled` / `Loading` | `loading` / `disabled` / 其他交互态 |

设计名里的几个维度，对应 `UIButton` 的 props：

| 设计维度 | 代码 props |
|----------|------------|
| `Primary / Secondary / Boring / White / Danger / Success / Blue / Purple / Yellow` | `color` |
| `Large / Medium / Small` | `size` |
| `Shadow / Flat / Stroke` | `variant` |
| `Square / Circle` | `shape` |
| `Loading / Disabled` | `loading` / `disabled` |
| `button-only-icon-*` | 只传 `icon`，不传默认 slot 文本 |

例如，目标命名应该能直接映射为：

- `Button/Medium/Primary/Shadow/Square/Default`
  - `\<UIButton color="primary" size="medium" variant="shadow" shape="square" \>`
- `Button/Large/White/Stroke/Square/Hover`
  - `\<UIButton color="white" size="large" variant="stroke" shape="square" \>`
- `Button-only icon/Medium/Primary/Stroke/Circle/Default`
  - `\<UIButton color="primary" size="medium" variant="stroke" shape="circle" icon="..." \>`
- `Button-only icon/Large/Danger/Shadow/Circle/Disabled`
  - `\<UIButton color="danger" size="large" variant="shadow" shape="circle" icon="..." disabled \>`

从 Figma 迁移到 Pencil 时，按钮命名按下面规则收口：

- 不再使用 `state=...`、`type=...` 这种属性串命名，统一改成路径式模板
- `type` 统一并入 `Color`
- `Shape=default` 统一写成 `Square`
- `size=medium（32）` 这类名称只保留档位，写成 `Medium`，不要把像素写进名称
- 状态统一使用 `Click`，不要在按钮族里混用 `Active`
- 有文字内容的按钮使用 `Button/...`
- 只有图标、没有默认文本 slot 的按钮使用 `Button-only icon/...`

迁移示例：

- `state=default, type=primary, size=medium（32）, Shape=default`
  - `Button/Medium/Primary/Shadow/Square/Default`

补充说明：

- 活跃 `builder-component.lib.pen` 的 button 命名现已按 `UIButton.vue` 词表收口。
- 历史页面快照或旧文档里仍可能看到 `Neutral` / `Neutra` / `Red` / `Default(Default)` 这类旧命名；出现时应按下面规则换算：
  - `Neutral` / `Neutra` -> `Boring`
  - `Red` -> `Danger`
  - 旧 `Default` variant 占位 -> 显式写成 `Shadow` / `Flat` / `Stroke`
  - 旧 `Default` shape 占位 -> 显式写成 `Square`

当前按钮库的实务基线有两点需要特别注意：

1. Button 叶子命名优先跟代码词表保持一致
- 后续扩 button family 时，优先沿用 `color / size / variant / shape / state`
- 不要再新增 `Neutral`、`Neutra`、`Red`、`Default(Default)` 这类旧命名组合

2. Page-level 引用通常经过聚合入口
- 页面通常不会直接依赖某个底层叶子 button 组件 ID
- 更常见的是引用 slot 聚合后的中间节点，例如：
  - `Shape-Square`
  - `Variant-Secondary`
  - `Variant-Boring`
  - `Variant-Large`
  - `Variant-Small`
- 所以如果设计库里发生“叶子组件删重 / 合并”，先检查这些聚合入口的 `slot` 是否同步更新，再判断页面是否需要改

### 2. `card-*-item*` 先看 `UIBlockItem` 这一层

设计库里的资源卡片并没有分别实现成一堆独立基础组件，而是统一落在 `UIBlockItem` 家族上：

- 基础外壳：`spx-gui/src/components/ui/block-items/UIBlockItem.vue`
- 标题样式：`spx-gui/src/components/ui/block-items/UIBlockItemTitle.vue`

在这个基础上，代码再分成几类中层组件：

| 设计组件族 | 基础/中层组件 | 业务组件入口 |
|------------|---------------|--------------|
| `card-sprite-item-*` | `UIEditorSpriteItem.vue` | `SpriteItem.vue`、`CostumeItem.vue`、`AnimationItem.vue`、`CheckableCostumeItem.vue` |
| `card-sound-item-*` | `UIEditorSoundItem.vue` | `stage/sound/SoundItem.vue` |
| `card-backdrop-item-*` | `UIEditorBackdropItem.vue` | `stage/backdrop/BackdropItem.vue` |
| `card-widget-item-*` | `UIEditorWidgetItem.vue` | `stage/widget/WidgetItem.vue` |
| `card-asset` | `UIBlockItem.vue` 作为统一抽象 | 被上面几类中层组件复用 |

大卡片版本也有对应实现：

- `spx-gui/src/components/ui/block-items/UISpriteItem.vue`
- `spx-gui/src/components/ui/block-items/UISoundItem.vue`
- `spx-gui/src/components/ui/block-items/UIBackdropItem.vue`

如果设计改动影响所有资源卡片的边框、圆角、激活态、hover 态、尺寸体系，优先改：

- `UIBlockItem.vue`
- `UIBlockItemTitle.vue`

如果只影响某一种资源卡片，优先改对应的 `UIEditor*Item.vue` 或业务组件。

### 3. 右上角 `corner-marker-*-more-*` 对应角标菜单

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

### 4. `card-state-item-*` 对应动画状态绑定弹窗

设计库里的 `card-state-item-default|step|die-*`，代码里最接近的落地实现是：

- `spx-gui/src/components/editor/sprite/animation/state/BoundStateEditor.vue`

这里仍然复用了：

- `UIBlockItem.vue`
- `UICornerIcon.vue`

也就是说，这一类不是单独的 `StateCard.vue`，而是基于通用卡片抽象组合出来的。

### 5. `card-entry` / `card-entry-item-*` 对应 Stage 快捷入口

设计库里的 `card-entry` 和其中的：

- `card-entry-item-backgrounds-*`
- `card-entry-item-sounds-*`
- `card-entry-item-widgets-*`

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

### 7. `segmented-*` 对应表单里的分段选择控件，而不是顶部导航 Tab

设计库里这类组件过去有一部分沿用 `Tab/*` 命名，但从设计语义看，它们更接近“分段选择 / segmented control”，不是编辑器顶部那种页面级导航 tab。

当前命名规范建议如下：

- 页面级导航继续使用 `tab` 语义：
  - `editor-nav-panel`
  - `editor-panel-*`
- 表单里用于二选一、多选一、模式切换的这类控件，统一使用 `segmented-*` 命名，不再新增 `Tab/*`：
  - `segmented-text-only-*`
  - `segmented-visibility-*`
  - `segmented-rotation-*`
  - `segmented-animation-*`
  - `segmented-code-modal-*`

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
- 设计层使用 `segmented-*`，代码映射文档再说明它对应 `UITabRadio*`
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

### 9. `editor-main-panel` / `editor-center-panel` / `editor-workspace-panel` 是页面级布局概念

这些设计组件在当前代码里没有 1:1 同名实现。实际代码被拆成了页面级布局组件：

- 页面入口：`spx-gui/src/pages/editor/index.vue`
- 编辑器总装：`spx-gui/src/components/editor/ProjectEditor.vue`
- 预览区：`spx-gui/src/components/editor/preview/EditorPreview.vue`
- 右侧资源面板：`spx-gui/src/components/editor/panels/EditorPanels.vue`
- 地图模式：`spx-gui/src/components/editor/map-editor/MapEditor.vue`
- 通用卡片壳：`spx-gui/src/components/ui/UICard.vue`
- 通用卡片头：`spx-gui/src/components/ui/UICardHeader.vue`

这类设计节点更适合当作“布局概念图”，不要期待在代码里直接找到同名文件。

### 10. `editor-tools-panel` / `editor-blocks-panel` 目前没有直接同名落地

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

### 11. `card-edit-item-*` 对应素材预处理流程，不是单独卡片组件

设计稿中的：

- `card-edit-item`
- `card-edit-item-remove-background-*`
- `card-edit-item-split-sprite-sheet-*`

当前前端的实际落地是素材预处理弹窗这一整套流程：

- 总入口：`spx-gui/src/components/asset/preprocessing/PreprocessModal.vue`
- 左侧方法入口：`spx-gui/src/components/asset/preprocessing/common/ProcessItem.vue`
- 方法详情容器：`spx-gui/src/components/asset/preprocessing/common/ProcessDetail.vue`
- 去背景：`spx-gui/src/components/asset/preprocessing/remove-background/RemoveBackground.vue`
- 切分精灵表：`spx-gui/src/components/asset/preprocessing/split-sprite-sheet/SplitSpriteSheet.vue`

这里同样不是 1:1 文件映射，而是“设计里的编辑卡片概念，代码里落成了一个完整流程”。

## Token Mapping

基础 token 的实际链接顺序，建议固定为：

1. 代码主源：
   - `spx-gui/src/components/ui/tokens/colors.ts`
   - `spx-gui/src/components/ui/tokens/index.ts`
   - `spx-gui/src/components/ui/UIConfigProvider.vue`
2. 设计组件库：
   - `ui/components/spx/builder-component.lib.pen`
3. 页面演示或局部镜像：
   - `ui/pages/spx/*.pen`

其中：

- 组件库层可以定义设计 token，但名称和值必须跟代码主源一致
- 页面层允许存在 `--ui-*` 镜像或 import alias 前缀变量，但这些都不能作为基础规范主源
- 页面如果只是消费组件库已有基础 token，应优先写成 `$r:*` / `$t:*` 这类 alias 引用，而不是再复制一份本地 `grey300` / `space-3`

常用对应关系：

| 设计语义 | 代码 token |
|----------|------------|
| Primary 按钮青色 | `primary` / `turquoise` |
| Sprite 黄色系 | `sprite` / `yellow` |
| Stage、Sound 蓝色系 | `stage` / `sound` / `blue` |
| Danger 红色系 | `danger` / `red` |
| Success 绿色系 | `success` / `green` |
| 灰阶 | `grey` |

补充规则：

- 如果设计稿改的是整套颜色，不要直接在业务组件里写死颜色，优先改 token。
- 如果设计稿改的是页面 `.pen` 中的局部变量，先回查这个值是否本应来自 `tokens/*.ts`。
- 如果活跃 `.pen` 里出现 `2:*`、`m:*` 这类 token 名，优先判断它是不是历史残留；如果看到 `2:`、`m:` 出现在页面 `ref` 或 `fill` 上，也要先确认它是不是 import alias，而不是把它误当成基础 token 命名。

### Batch Token Change Workflow

批量修改 token 时，先判断你要做的是哪一种任务：

#### A. 只把 `ui/**` 同步到当前代码主源

这是默认模式，也是本文的首选模式。

适用场景：

- 页面 `.pen` 里仍残留旧色值或局部镜像
- `builder-component.lib.pen` 的变量值落后于当前代码主源
- 用户没有要求修改 `spx-gui/src/components/ui/tokens/colors.ts`

执行顺序：

1. 先读取代码主源：
   - `spx-gui/src/components/ui/tokens/colors.ts`
2. 再同步 `ui/components/spx/builder-component.lib.pen` 里的同名变量：
   - `turquoise*`
   - `yellow*`
   - `blue*`
   - `red*`
   - 以及相关语义色族
3. 最后清理 `ui/pages/spx/*.pen` 的局部镜像变量，让页面优先走 import alias。
4. 运行：

```bash
npm --prefix spx-gui run test -- src/utils/builder-component-lib.test.ts --run
```

#### B. 修改 canonical palette

这不是默认模式。只有当用户明确要求“改基础色板主源”时，才进入这个模式。

适用场景：

- 要改 `primary / turquoise`
- 要改 `sprite / yellow`
- 要改 `stage / sound / blue`
- 要改 `danger / red`

执行顺序：

1. 先得到用户对 `spx-gui/src/components/ui/tokens/colors.ts` 的明确授权。
2. 修改代码主源：
   - `spx-gui/src/components/ui/tokens/colors.ts`
3. 再把同名变量同步到：
   - `ui/components/spx/builder-component.lib.pen`
4. 如有页面局部镜像或旧色值，再同步：
   - `ui/pages/spx/*.pen`
5. 运行：

```bash
npm --prefix spx-gui run test -- src/utils/builder-component-lib.test.ts --run
```

当前自动校验的限制要一并说明：

- `turquoise` 目前有专门的 palette 等值断言。
- `yellow`、`blue`、`red` 现在也有 palette 等值断言。
- `green`、`purple` 目前还没有同等级的专门 palette 断言。
- 因此批量改 `green` 或 `purple` 时，除了跑测试，还应人工对照 `colors.ts` 与 `builder-component.lib.pen` 的同名变量是否完全一致。

### Color-Family Lookup

当你批量修改这几组颜色时，可按下面的语义映射回查影响面：

| 颜色族 | 代码主源 | 常见语义别名 | 设计侧主要同步位置 |
|--------|----------|--------------|--------------------|
| `turquoise` | `primary` | 主按钮、主强调色 | `builder-component.lib.pen` 的 `turquoise*`；社区页和编辑器页里的旧 turquoise 镜像 |
| `yellow` | `sprite` | 精灵、资源高亮 | `builder-component.lib.pen` 的 `yellow*`；相关页面局部镜像 |
| `blue` | `stage` / `sound` | 舞台、声音 | `builder-component.lib.pen` 的 `blue*`；`editor-stage.pen` 等历史蓝色镜像 |
| `red` | `danger` | 危险、删除、错误 | `builder-component.lib.pen` 的 `red*`；危险态按钮或提示相关页面镜像 |

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
- 不要假设 `ui/pages/spx/*.pen` 里的局部变量就是基础 token 主源。
- 不要假设 `builder-component.lib.pen` 当前所有命名都已经与代码 props 词表对齐。
- 不要把 `builder-component.lib.pen` 当成当前代码的完整镜像，它里面有一部分是当前代码已抽象实现的组件，也有一部分更偏概念稿或未来方向。

## Short Conclusion

对于 `builder-component.lib.pen`，当前最稳定的设计到代码映射主线是：

- `button-*` -> `UIButton.vue`
- `card-*-item*` / `card-asset` -> `UIBlockItem.vue` + `UIEditor*Item.vue` + 对应业务 `*Item.vue`
- `corner-marker-*` -> `UICornerIcon.vue` + `CornerMenu.vue`
- `editor-nav-panel` / `editor-panel-*` -> `EditorHeader.vue` + `UITabs.vue` + `SpriteEditor.vue` / `StageEditor.vue`
- `segmented-*` -> `UITabRadioGroup.vue` + `UITabRadio.vue`
- `left-panel-*` -> `EditorList.vue` + 各类 `*Editor.vue`
- `card-edit-item-*` -> `PreprocessModal.vue` 及其子流程组件

以后开发者同步设计稿时，优先按“基础组件 -> 业务组合 -> 页面布局”的顺序去定位实现，而不是按设计名字硬找同名文件。
