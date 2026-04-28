# Component Naming Rules

本文只保留两套命名规则：文件资源命名与 `.pen` 设计组件节点命名。

## 1. `ui/docs` 与 `ui/images`

`ui/docs` 与 `ui/images` 面向文件系统、路径和资源引用，统一使用 `kebab-case`。

规则：

- 全部小写
- 单词之间使用 `-`
- 不使用空格、下划线或大小写混排
- 适用于文档目录、文档文件、图片资源名和图片引用路径

示例：

```text
component-docs-naming.md
sprite-card-default.png
add-sprite-item-medium-active.png
card-widget-item-medium-hover.png
```

## 2. `ui/components/spx/builder-component.lib.pen`

`builder-component.lib.pen` 面向设计组件库，可复用组件节点的 `name` 字段统一使用 `/` 分层命名。

标准格式：

```text
Category/ComponentName/VariantOrState
```

规则：

- 使用 `/` 区分层级
- 每一段使用 `PascalCase`
- 第 1 段表示组件类别，例如 `Card`、`GenItem`
- 第 2 段表示具体组件语义，例如 `SpriteItem`、`AddSpriteItem`、`Costume`
- 第 3 段表示尺寸、状态或变体组合，例如 `MediumDefault`、`MediumActiveNoBg`、`HoverNotGen`
- 不把每个单词都拆成独立层级

示例：

```text
Card/SpriteItem/MediumDefault
Card/AddSpriteItem/MediumActiveNoBg
Card/SelectSoundItem/MediumHover
Card/WidgetItem/MediumCornerMenu
GenItem/Costume/HoverNotGen
```

旧名称迁移示例：

```text
card-select-sound-item-medium-active
=> Card/SelectSoundItem/MediumActive

genitem-costume-hover-not-gen
=> GenItem/Costume/HoverNotGen
```
