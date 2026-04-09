# Vue 3 + Tailwind 4 组件设计规范（草稿）

> 适用范围：`spx-gui`
>
> 状态：Draft
>
> 目标：为后续基于 `Vue 3 + Tailwind 4` 的组件开发提供一套统一的设计和实现约定，分别覆盖 UI 组件与业务组件。

## 1. 目标与边界

本文档关注以下问题：

- 在 `Vue 3 + Tailwind 4` 中，组件应该如何划分职责。
- 父组件传 `class` 给子组件时，哪些场景应该支持，哪些场景不应该依赖。
- UI 组件与业务组件分别应该如何暴露样式定制能力。
- 什么时候优先用 Tailwind utility，什么时候保留少量本地 CSS。

本文档**不**要求兼容当前临时 UI 组件库的实现风格；以长期最佳实践为主，同时给出可接受的备选方案。

---

## 2. 总体原则

### 2.1 先分清组件类型

项目中的组件先分成两类：

1. **UI 组件**
   - 通用、可复用、偏设计系统能力。
   - 例如：`Button`、`Input`、`Dialog`、`Tabs`、`Popover`、`Badge`。

2. **业务组件**
   - 面向具体业务场景，包含页面语义、数据结构或交互流程。
   - 例如：`ProjectCard`、`SpriteListPanel`、`TutorialChapterSidebar`、`ProjectPublishDialogContent`。

这两类组件最重要的区别不是“长得像不像 UI”，而是：

- **UI 组件**优先提供稳定的抽象能力。
- **业务组件**优先表达业务语义与页面结构。

---

### 2.2 不要把 utility 冲突顺序当成组件契约

在 `Tailwind 4` 中，如果两个 utility 都命中了同一个 CSS 属性，最终谁生效，通常取决于：

- specificity
- layer
- Tailwind 生成的 CSS rule 顺序
- 是否使用了 `!important`

**不要**把以下写法当成可靠契约：

```vue
<Child class="px-2" />
```

去覆盖子组件内部：

```vue
class="px-4"
```

原因是：**HTML `class` 字符串顺序本身不是稳定 API。**

结论：

- 不要依赖“父组件传的 utility 总能覆盖子组件默认 utility”。
- 如果要支持覆盖，应当通过明确 API 或显式合并策略实现。

---

### 2.3 父组件管布局，子组件管外观

这是默认规则：

- **父组件负责布局**：间距、宽高占位、栅格位置、排序、对齐。
- **子组件负责外观**：颜色、边框、圆角、内部间距、状态样式、动效。

这条规则对两类组件都成立，但业务组件应执行得更严格。

---

### 2.4 优先暴露语义化 API，而不是样式漏洞

当一个组件需要定制时，优先顺序建议如下：

1. **语义化 props**
2. **slots / scoped slots**
3. **局部 class props**（例如 `headerClass`、`bodyClass`）
4. **root `class` 透传**
5. **依赖 utility 冲突覆盖**

第 5 种不应作为正式约定。

---

### 2.5 默认使用 Tailwind；本地 CSS 保持少量且有理由

默认规则：

- 优先在模板中直接使用 Tailwind utility。
- 优先使用项目已有的语义 token，例如 `text-text`、`text-title`、`bg-primary-100`。
- 当以下场景出现时，可保留少量本地 CSS：
  - `:deep(...)`
  - 生成内容
  - 第三方 DOM 覆盖
  - 难以阅读的结构性选择器
  - 多节点共享且较复杂的状态样式

如果本地样式只服务于一两个节点，优先直接写在模板里，而不是额外抽一层 `@apply`。

---

## 3. UI 组件规范

## 3.1 UI 组件的目标

UI 组件的主要目标是：

- 为产品提供稳定、可组合的视觉原语。
- 隐藏实现细节，暴露明确、一致、可预测的 API。
- 尽量减少业务上下文对组件内部结构的依赖。

UI 组件不是页面片段，也不应承载太多业务判断。

---

## 3.2 UI 组件推荐的公开能力

UI 组件推荐优先暴露以下能力：

### 3.2.1 语义化变体 props

优先用 props 表达稳定的视觉变体，而不是让外部自由覆盖内部样式。

常见 props：

- `size`: `small | medium | large`
- `tone` / `color`: `primary | secondary | danger | success | neutral`
- `variant`: `solid | soft | outline | ghost | link`
- `shape`: `square | rounded | pill | circle`
- `loading`
- `disabled`
- `block`

示例：

```vue
<UIButton variant="solid" color="primary" size="medium" />
```

而不是：

```vue
<UIButton class="h-8 rounded-md bg-primary-main px-4 text-white" />
```

---

### 3.2.2 slots

当定制内容结构比定制样式更重要时，优先用 slot。

例如：

- `icon`
- `prefix`
- `suffix`
- `title`
- `description`
- `actions`

slot 是内容扩展点，不是样式逃生口。

---

### 3.2.3 少量、明确的局部 class props（可选）

如果某个 UI 组件天然有稳定分区，且确实需要在少量场景下开放布局扩展，可以提供少量局部 class props，例如：

- `rootClass`
- `contentClass`
- `iconClass`
- `labelClass`

但要注意：

- 这类 API 是显式扩展点，必须文档化。
- 不要一次性暴露太多位置；只开放真正稳定的区域。
- 默认仍然以 props 和 slots 为主。

---

## 3.3 UI 组件的样式归属

### 推荐做法

- 组件自身的视觉样式由组件内部定义。
- 外部调用方**默认不应**依赖 root `class` 去覆盖内部的颜色、圆角、padding、边框等基础视觉样式。
- 组件的主视觉变体必须通过 props 控制。

### 为什么

因为 UI 组件属于公共抽象层。如果允许外部任意覆盖内部样式：

- 会破坏组件库的一致性。
- 会让组件难以重构。
- 会让调用方依赖内部 DOM 和类名布局。

---

## 3.4 UI 组件对 root `class` 的默认策略

### 默认推荐：仅支持布局扩展，不承诺视觉覆盖

推荐把 root `class` 视为：

- 页面布局用途
- 容器摆放用途
- 外层 spacing / sizing 用途

例如：

```vue
<UIButton class="w-full self-start" />
```

这是合理的。

但以下不应作为组件契约：

```vue
<UIButton class="rounded-none bg-red-500 px-2" />
```

如果产品确实需要这些变化，应当为它们补充语义化 props。

---

## 3.5 UI 组件的两种实现模式

### 模式 A：严格型 UI 组件（默认推荐）

适合：基础组件、设计系统组件、需要稳定一致性的组件。

特点：

- 变体全部由 props 定义。
- root `class` 只用于布局扩展。
- 不承诺通过外部 utility 覆盖内部 utility。
- 内部结构尽量稳定，局部扩展点有限。

这是**首选模式**。

### 模式 B：可扩展型 UI 组件（备选）

适合：容器类基础组件、需要被多个页面轻度定制的组件，例如 `Card`、`Panel`、`EmptyState`。

特点：

- 除 props 外，允许少量局部 `class` 扩展。
- 需要显式声明哪些位置允许定制。
- 如果要支持 utility 冲突覆盖，组件内部必须自己做 class 合并，而不是依赖 Vue 自动 fallthrough 的最终效果。

这种模式是**有成本的扩展模式**，不应成为所有 UI 组件的默认形态。

---

## 3.6 如果 UI 组件确实要支持 class 覆盖

如果某些组件确实希望让调用方覆写一部分 utility，建议遵循以下约定：

1. 不要把“是否能覆盖成功”交给 Tailwind rule 顺序碰运气。
2. 明确哪些位置可覆盖，例如 `rootClass`、`contentClass`。
3. 在组件内部显式合并 class。
4. 如果引入专门的 class merge 工具，应统一选型并在项目内共用。

推荐的可选技术方案：

- `clsx`：负责条件拼接。
- `tailwind-merge`：负责冲突 utility 去重。
- 项目内封装一个统一的 `cn()` / `mergeClassNames()` 辅助方法。

示例：

```ts
import { twMerge } from 'tailwind-merge'

function cn(...values: Array<string | false | null>) {
  return twMerge(values.filter((value) => value != null && value !== false).join(' '))
}
```

然后在组件中显式控制：

```vue
<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()

const rootClass = computed(() => {
  return cn(
    'inline-flex items-center justify-center rounded-2 text-body',
    'bg-primary-main text-white',
    attrs.class as string | null
  )
})
</script>

<template>
  <button v-bind="{ ...attrs, class: null }" :class="rootClass">
    <slot />
  </button>
</template>
```

注意：

- 这是**显式开放覆盖能力**，不是默认行为。
- 一旦开放，就要把它写进文档，并长期维护。

---

## 3.7 UI 组件推荐的结构约定

### 推荐

- 公共状态尽量暴露为 props：`disabled`、`loading`、`active`、`selected` 等。
- DOM 状态尽量通过语义属性表达：
  - `disabled`
  - `aria-*`
  - `data-state`
  - `data-selected`
  - `data-loading`
- 当样式依赖组件内部状态时，优先让模板直接表达，而不是隐藏到复杂选择器里。

示例：

```vue
<button
  :data-loading="loading || null"
  :disabled="disabled || loading"
  class="inline-flex items-center justify-center rounded-2 px-4 py-2 text-body transition"
  :class="[
    variant === 'solid' && 'bg-primary-main text-white',
    variant === 'outline' && 'border border-border bg-white text-text',
    disabled && 'cursor-not-allowed opacity-50'
  ]"
>
  <slot />
</button>
```

---

## 3.8 UI 组件评审标准

评审 UI 组件时，重点检查：

- 是否把主视觉变体暴露成了 props。
- 是否错误依赖了外部 root `class` 覆盖内部视觉样式。
- 是否为长期稳定的内部区域提供了明确扩展点。
- 是否保持了可访问性属性与交互语义。
- 是否使用了语义 token，而不是硬编码产品色值。

---

## 4. 业务组件规范

## 4.1 业务组件的目标

业务组件的主要目标是：

- 表达一个具体业务场景的结构和语义。
- 降低页面复杂度，提高业务逻辑可读性。
- 让页面装配清晰，而不是追求高度通用。

业务组件不是小型 UI 库；不要为了“可复用”而过度抽象。

---

## 4.2 业务组件的默认样式策略

### 默认推荐：父组件控制布局，业务组件自己控制视觉

业务组件默认遵循以下分工：

- 父组件通过 root `class` 控制布局：
  - `mt-*`
  - `w-*`
  - `flex-*`
  - `grid-*`
  - `self-*`
  - `order-*`
- 业务组件内部控制自己的视觉和内部结构：
  - 背景
  - 内边距
  - 标题层级
  - 信息层次
  - 状态色
  - 内部块之间的间距

这条规则比 UI 组件更重要，因为业务组件更容易和具体 DOM 结构耦合。

---

## 4.3 业务组件推荐的公开能力顺序

业务组件对外的定制能力推荐按以下顺序设计：

1. **业务语义 props**
2. **slots**
3. **少量局部 class props**
4. **root `class` 用于布局**

### 4.3.1 优先暴露业务语义 props

例如：

- `status`
- `readonly`
- `collapsed`
- `highlighted`
- `editable`
- `showActions`
- `dense`

推荐：

```vue
<ProjectCard status="draft" highlighted />
```

不推荐：

```vue
<ProjectCard class="border-yellow-400 bg-yellow-50" />
```

后者没有表达业务意图，只是暴露了某个视觉实现。

---

### 4.3.2 需要改内容结构时，用 slots

例如一个业务面板：

- 标题区域
- 描述区域
- 操作区域
- 空状态区域

这类定制应优先用 slots，而不是让父组件猜测内部 DOM 结构。

---

### 4.3.3 需要改局部布局时，用局部 class props

当业务组件内部确实有稳定区域，且父组件需要补充少量局部布局时，可以开放：

- `headerClass`
- `bodyClass`
- `actionsClass`
- `listClass`

例如：

```vue
<ProjectCardList bodyClass="max-h-80 overflow-auto" />
```

这种做法比只给一个 root `class` 更可控。

---

## 4.4 业务组件对 root `class` 的推荐策略

### 推荐：支持 root `class`，但仅作为外部布局接口

业务组件通常应该允许这样使用：

```vue
<ProjectCard class="mt-4 w-full desktop:w-[420px]" />
```

因为父组件确实需要决定它在页面中的摆放方式。

但不推荐把以下能力当成正式契约：

```vue
<ProjectCard class="rounded-none bg-red-500 p-0 text-xs" />
```

如果某个业务组件频繁被这样使用，通常说明：

- 这个组件还没抽出足够明确的语义 props；或
- 这个组件的边界划分不对；或
- 它其实更像一个 UI 容器组件，而不是业务组件。

---

## 4.5 业务组件推荐的两种实现模式

### 模式 A：结构型业务组件（默认推荐）

适合：绝大多数业务组件。

特点：

- 组件对外表达业务语义。
- 页面传入数据与业务状态。
- root `class` 只处理外部布局。
- 内部视觉由组件自己定义。
- 少量局部扩展通过 slot 或局部 class prop 提供。

这是默认首选。

### 模式 B：页面级壳组件（备选）

适合：更接近页面片段、布局容器、一次性组合组件。

特点：

- 可以更自由地接收 root `class`。
- 可以把更多布局责任留给父层。
- 复用性不是首要目标。

如果组件只在一个页面或一个流程里使用，不必强行把它做成“严格业务组件”。

---

## 4.6 什么时候不应该再抽业务组件

当一个片段满足以下条件时，可以先保持在页面内，而不是急着抽组件：

- 只会在一个页面使用。
- 业务语义还没稳定。
- 结构变化很快。
- 抽出来后，props 和 slots 反而比模板本身更难懂。

建议：

- 页面内先用小范围的 Tailwind 模板表达。
- 等结构稳定后再抽成业务组件。

---

## 4.7 业务组件推荐示例

### 推荐

```vue
<ProjectCard
  :project="project"
  :highlighted="project.id === selectedProjectId"
  class="w-full desktop:w-[360px]"
  bodyClass="min-h-48"
>
  <template #actions>
    <UIButton size="small">Open</UIButton>
  </template>
</ProjectCard>
```

这里：

- `highlighted` 是业务语义。
- root `class` 只负责摆放宽度。
- `bodyClass` 是局部稳定扩展点。
- `actions` 用 slot 表达内容扩展。

### 不推荐

```vue
<ProjectCard
  :project="project"
  class="w-full rounded-none border-red-500 bg-red-50 p-0 [&_.title]:text-xs"
/>
```

问题：

- 父组件直接接管了子组件外观。
- 依赖内部 DOM 结构。
- 未来重构成本很高。

---

## 5. 选型建议：什么时候选哪种模式

| 场景 | 推荐方案 |
| --- | --- |
| 基础按钮、输入框、标签、菜单等 | 严格型 UI 组件 |
| 通用卡片、空状态、面板等基础容器 | 可扩展型 UI 组件 |
| 项目卡片、资源列表、教程侧栏等业务结构 | 结构型业务组件 |
| 页面内一次性布局块 | 页面级壳组件或直接留在页面 |

---

## 6. 关于 root `class` 的统一约定

建议团队统一采用下面这套规则：

### 6.1 UI 组件

- 默认允许 root `class` 透传。
- 但只把它视为**布局扩展接口**。
- 不承诺用它覆盖内部主视觉样式。
- 如果某个 UI 组件需要开放覆写能力，应显式定义 `rootClass` / `contentClass` 等 API，并在内部完成合并。

### 6.2 业务组件

- 默认允许 root `class` 透传。
- 将其视为**父层布局控制接口**。
- 不鼓励通过它控制业务组件内部视觉风格。
- 内部视觉差异优先由业务语义 props 表达。

---

## 7. 推荐的开发流程

### 7.1 开始写组件前，先回答 4 个问题

1. 这是 UI 组件还是业务组件？
2. 谁拥有这个组件的视觉定义：组件自己，还是调用方？
3. 调用方真正要定制的是布局、视觉变体，还是内部某个分区？
4. 这个定制点应该暴露成 props、slots，还是局部 class prop？

如果这 4 个问题没想清楚，通常会很快走向“所有东西都靠 `class` 传”。

---

### 7.2 推荐的 API 设计顺序

1. 先定义组件职责。
2. 再定义必要的语义 props。
3. 再定义内容 slots。
4. 最后才考虑是否需要 class 扩展点。

不要倒过来：先给一个 `class`，再让调用方自己拼出所有语义。

---

## 8. 常见反模式

### 8.1 把 root `class` 当作万能扩展口

表现：

- 调用方通过一长串 utility 改掉组件几乎所有视觉规则。
- 子组件是否还能“被覆盖”取决于 Tailwind 生成顺序。

问题：

- API 不稳定。
- 难以维护。
- 组件重构风险大。

---

### 8.2 业务组件过度组件库化

表现：

- 本来是一个页面私有块，却设计了大量通用 props。
- 为了“以后可能复用”提前暴露很多抽象。

问题：

- API 复杂度上升。
- 真实语义反而变弱。

---

### 8.3 只给一个大而全的 `class`，不给语义 props

表现：

- `class` 既负责布局，又负责视觉，又负责局部结构。

问题：

- 组件边界不清楚。
- 调用代码读不出业务意图。

---

### 8.4 为了复用强行抽复杂 `@apply` 层

表现：

- 一个组件只有一两个节点，却把大量 utility 挪到本地 `@apply`。

问题：

- 跳转成本变高。
- 维护时看不到真实样式。

建议：

- 单点样式优先保留在模板中。
- 只有在复用、结构选择器或可读性确实更好时，才抽本地样式。

---

## 9. 评审清单

提交组件代码时，建议按以下清单自查：

### 9.1 通用

- [ ] 组件类型判断是否正确：UI 组件还是业务组件？
- [ ] 是否优先使用了语义 token，而不是临时色值？
- [ ] 是否避免把 utility 冲突顺序当成 API？
- [ ] 是否只在有明确理由时保留本地 CSS？

### 9.2 UI 组件

- [ ] 主视觉差异是否通过 props 暴露？
- [ ] slots 是否只承担内容扩展，而不是样式逃生口？
- [ ] 如果开放 class 覆盖，是否是显式、文档化、内部可控的？
- [ ] root `class` 是否只作为布局扩展约定？

### 9.3 业务组件

- [ ] root `class` 是否只承担外部布局？
- [ ] 视觉差异是否通过业务语义 props 表达？
- [ ] 是否避免父组件依赖子组件内部 DOM 结构？
- [ ] 如果需要局部定制，是否优先用了 slot 或局部 class prop？

---

## 10. 推荐的默认结论

如果没有更强理由，建议采用以下默认策略：

### UI 组件

- **默认使用严格型 UI 组件模式。**
- 主视觉变体走 props。
- root `class` 只负责布局扩展。
- 不承诺外部 utility 覆盖内部 utility。

### 业务组件

- **默认使用结构型业务组件模式。**
- 父组件负责布局。
- 业务组件负责视觉和结构。
- 定制优先用业务 props、slots、局部 class prop。

这套默认策略的核心目标是：

- API 稳定
- 职责清晰
- 组件可重构
- 页面代码仍然保持 Tailwind 的开发效率

