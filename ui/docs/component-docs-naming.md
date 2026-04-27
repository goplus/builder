# AI-Friendly Component Docs Naming Spec

本文定义设计组件库文档的命名与组织规范，目标不是只让人“看得懂”，而是让 AI 能稳定地检索、生成、重命名、补全文档并批量改动。

适用范围：

- `ui/docs` 下的组件文档
- 未来新增的组件说明、API、示例、无障碍文档
- 设计组件与前端实现之间的映射文档
- `ui/components/spx/builder-component.lib.pen` 中可文档化组件的命名映射

不适用范围：

- Vue / TypeScript 代码文件命名
- 页面级产品文档
- 临时讨论稿或归档材料

## Goals

这套规范优先解决四个问题：

1. 让 AI 能唯一定位某个组件的文档目录与主页
2. 让 AI 能根据固定规则创建缺失文件，而不是猜文件名
3. 让 AI 在组件改名时能安全迁移路径、slug 与元数据
4. 让人类与机器使用同一套 canonical naming，不出现别名漂移

## Canonical Naming Model

每个组件必须同时具备以下四种名字，其中只有一个是机器主键：

| 层级       | 规则                             | 示例          |
| ---------- | -------------------------------- | ------------- |
| 代码组件名 | `PascalCase`                     | `DatePicker`  |
| 组件 ID    | `kebab-case`                     | `date-picker` |
| 文档目录名 | 与 `component_id` 字段值完全一致 | `date-picker` |
| 文档标题   | 面向人类展示                     | `Date Picker` |

唯一机器主键是 `component_id`。

`component_name` 和 `component_id` 指向同一个组件，不代表两个组件。区别只在使用场景：

- `component_name` 给代码、设计组件主名和人工阅读使用，例如 `DatePicker`
- `component_id` 给文档目录、slug、frontmatter 主键和机器检索使用，例如 `date-picker`
- 单词组件也遵守同一规则，例如 `Button` 对应 `button`

约束如下：

- `component_id` 一律使用小写英文、数字、短横线 `-`
- 一个组件只允许一个 canonical `component_id`
- 目录名必须等于 `component_id`
- slug 必须由 `component_id` 派生
- 代码组件名必须能由 `component_id` 唯一映射得到

禁止出现以下并存情况：

- `DatePicker`
- `datepicker`
- `datePicker`
- `date_picker`
- `date-picker`

上面五种写法里，只能保留：

- 代码里：`DatePicker`
- 文档与路径里：`date-picker`

## Directory Layout

组件文档必须使用固定目录结构，避免 AI 自由发挥：

```text
ui/docs/components/
  button/
    index.md
    api.md
    examples.md
    accessibility.md
  date-picker/
    index.md
    api.md
    examples.md
    accessibility.md
```

规则如下：

- 每个组件一个目录
- 组件主页固定为 `index.md`
- 专题页只允许使用保留文件名
- 不允许把多个组件写进同一个组件目录
- 不允许创建 `intro.md`、`usage.md`、`guide.md` 这类语义重叠文件

## Reserved Filenames

组件目录下允许的标准文件名：

| 文件名             | 职责                                   |
| ------------------ | -------------------------------------- |
| `index.md`         | 组件概览、适用场景、设计原则           |
| `api.md`           | Props、events、slots、tokens、状态说明 |
| `examples.md`      | 标准示例、推荐写法、反例               |
| `accessibility.md` | 键盘交互、语义、ARIA、读屏说明         |

如果未来需要新增固定专题页，应先扩展这份规范，再统一落地。不要让 AI 临时创造新文件名。

## Frontmatter Schema

每个组件的 `index.md` 必须包含统一 frontmatter。AI 在检索、补全、改名时应优先读取 frontmatter，而不是猜正文语义。

示例：

```md
---
component_id: date-picker
component_name: DatePicker
title: Date Picker
category: form
status: stable
slug: /ui/components/date-picker
owner: design-system
since: 1.2.0
related_components:
  - input
  - calendar
aliases: []
tags:
  - form
  - date
---
```

字段约束：

- `component_id`：必填，`kebab-case`，机器主键
- `component_name`：必填，`PascalCase`
- `title`：必填，展示标题
- `category`：必填，使用固定词表
- `status`：必填，使用固定词表
- `slug`：必填，必须与 `component_id` 对应
- `owner`：选填，维护人或维护组
- `since`：选填，首次引入版本
- `related_components`：选填，存放其他组件的 `component_id`
- `aliases`：默认空数组，仅用于历史兼容，不可作为主引用名
- `tags`：选填，用于搜索与聚合

推荐词表：

- `category`：`form`、`feedback`、`navigation`、`layout`、`data-display`、`overlay`
- `status`：`draft`、`stable`、`deprecated`

## Naming Rules

### 1. 路径层一律使用 `kebab-case`

以下对象统一使用 `kebab-case`：

- 组件目录名
- 文档 slug
- 文档内引用的组件 ID
- 自动生成的锚点标识

示例：

- `button`
- `icon-button`
- `date-picker`
- `multi-select`

### 2. 代码层保留 `PascalCase`

代码组件名不跟随文档路径风格变化：

- `Button`
- `IconButton`
- `DatePicker`

AI 在跨文档与代码做映射时，必须使用同一条规则：

```text
component_id: date-picker <-> component_name: DatePicker
```

### 3. 展示标题不作为机器标识

标题可以写成：

- `Date Picker`
- `日期选择器`

但 AI 不应把标题当成路径或主键使用，所有自动化逻辑统一以 `component_id` 为准。

## Design Library Naming

`builder-component.lib.pen` 里的 `name` 不全部等于 `component_name`。先按用途区分：

| 类型       | 用途                                | 示例                            |
| ---------- | ----------------------------------- | ------------------------------- |
| 组件主名   | 可文档化组件，对应 `component_name` | `Button`                        |
| 变体路径   | 表达尺寸、样式、状态等组合          | `Button/Medium/Primary/Default` |
| 内部图层名 | 设计实现细节，不作为文档主键        | `Icon`, `Label`                 |

基础映射方式：

```text
component_name: Button
component_id: button
pen reusable: Button/Medium/Primary/Default
```

规则如下：

- 文档目录和 slug 只使用 `component_id`，例如 `button`
- `.pen` 里的组件主名使用 `PascalCase`，例如 `Button`
- `.pen` 里的变体可以用 `/` 分层，但不要直接当作组件文档目录
- 临时词不要进入主名或路径，例如 `new`、`final`、`draft2`
- 带空格的旧命名应收敛为稳定主名，例如 `Button-only icon` 收敛为 `IconButton`

Button 变体建议只保留必要层级，不要求每个变体都写满：

```text
Button/<Size>/<Intent>/<State>
Button/Medium/Primary/Default
Button/Medium/Primary/Disabled
```

## Repository Path Naming

仓库里的路径型名称统一使用小写 `kebab-case`：

- `ui/docs` 下的规范文档，例如 `component-docs-naming.md`
- 组件目录，例如 `ui/docs/components/date-picker/`
- 组件主页固定为 `index.md`
- 组件专题页只使用保留文件名，例如 `api.md`、`examples.md`、`accessibility.md`
- `ui/images` 下的普通图片，例如 `project-fullscreen.png`、`notification-success.png`

字体文件、图标字体这类外部资源可以保留官方或全库统一命名。其他新文件不要使用空格、冒号、下划线、无语义编号或临时后缀。

## Allowed and Disallowed Component IDs

本节只约束 `component_id`、文档目录、slug、图片文件名等路径型名称；不约束 `.pen` 变体路径中的 `PascalCase` 段。

推荐：

- `button`
- `icon-button`
- `date-picker`
- `toast`

不推荐：

- `DatePicker`
- `datePicker`
- `date_picker`
- `datepicker`
- `button-final`
- `button-new`
- `toast-v2`

额外约束：

- 禁止空格
- 禁止下划线
- 禁止大小写混用
- 禁止使用 `temp`、`draft2`、`new`、`final` 这类状态词进入文件名
- 缩写只在全库统一时允许，例如 `api`、`ui`、`sdk`

## AI Operation Rules

如果 AI 需要自动新增、修改、迁移组件文档，必须遵循以下规则：

### 新增组件

1. 先确定唯一 `component_id`
2. 创建 `ui/docs/components/<component_id>/`
3. 至少创建 `index.md`
4. `index.md` 必须带完整 frontmatter
5. 如需新增专题页，只能使用保留文件名

### 重命名组件

1. 先修改 `component_id`
2. 同步重命名目录
3. 同步更新 `slug`
4. 同步更新所有 `related_components` 引用
5. 保留旧名到 `aliases`
6. 不得只改标题而不改路径映射

### 批量补全文档

AI 批量补全时：

- 不得新造目录结构
- 不得新造页面类型
- 不得改动 `component_id`，除非任务明确要求重命名
- 不得把正文中的自然语言标题回写为路径名

## Validation Checklist

新增或修改组件文档后，应至少检查以下项目：

- 目录名是否等于 `component_id`
- `component_id` 是否为 `kebab-case`
- `component_name` 是否为 `PascalCase`
- slug 是否与 component_id 路径保持一致
- `index.md` 是否包含完整 frontmatter
- 是否出现多个别名同时充当主引用名
- 是否创建了未在规范中登记的文件名

## Example

推荐落地方式：

```text
ui/docs/components/date-picker/index.md
ui/docs/components/date-picker/api.md
ui/docs/components/date-picker/examples.md
ui/docs/components/date-picker/accessibility.md
```

其中：

- `component_id`：`date-picker`
- `component_name`：`DatePicker`
- `title`：`Date Picker`
- `slug`：`/ui/components/date-picker`

## Migration Guidance

如果现有文档还没有统一结构，建议按以下顺序迁移：

1. 先为每个组件确定唯一 `component_id`
2. 再把目录统一为 `kebab-case`
3. 补齐 `index.md` frontmatter
4. 最后再拆分 `api.md`、`examples.md`、`accessibility.md`

迁移期间，允许在 frontmatter 的 `aliases` 中短暂保留历史名称，但不得继续把历史名称当作新文档路径使用。

## Summary

这套规范的核心不是“文档好看”，而是“低歧义、可预测、可迁移”。

对设计组件库文档来说：

- `kebab-case` 负责稳定路径和标识
- `PascalCase` 保留代码语义
- frontmatter 提供机器可读元数据
- 固定目录结构减少 AI 猜测空间

如果未来要做脚本校验、自动补文档、批量改名或设计到代码映射，这套规则可以直接作为约束基础。
