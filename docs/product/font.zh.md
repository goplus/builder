# 字体 Font

XBuilder 中的项目可能包含多种文本内容，包括 Widget（如 Monitor）中的文本、作为 Costume / Backdrop 的 SVG 图片中的文本，以及将来更多游戏 UI 元素中的文本。

## 背景

### 需求

文本渲染需要解决几类问题：

* 兼容 Scratch 项目。Scratch 项目中的 SVG 图片可能使用 Scratch 特有字体。
* 支持中文文本，并随着 XBuilder 国际化能力增强，支持更多语言。
* 支持 Emoji。Emoji 字体的体积和格式差异很大，不适合无条件内置到引擎中。例如 Noto Color Emoji 的字体文件通常在 9 MB 到 24 MB 左右；即使较小的 Twemoji Mozilla 字体，未压缩也约 1.4 MB，且覆盖范围、格式和渲染兼容性与 Noto Color Emoji 不同。
* 长期来看，支持项目自定义字体，让项目获得特定的视觉风格。

### Web 运行时限制

在 Web 运行时，XBuilder 很难直接使用用户系统中已经安装的字体作为 Project 的文本渲染能力。

首先，浏览器并没有稳定、跨浏览器的系统字体访问能力。Local Font Access API 可以枚举本机字体，并在用户授权后读取字体数据，但它仍属于实验性能力，主要由桌面 Chromium 支持，不适合作为 XBuilder 字体方案的基础假设。

其次，XBuilder 的游戏运行时不是把文本交给浏览器 DOM / CSS 直接渲染，而是通过 spx / Godot Web 渲染游戏内容。对于这样的运行时，仅知道系统字体名通常不够；spx 需要拿到字体文件内容，或等价的 glyph、metrics、OpenType 表等字体数据，才能在运行时完成文本布局和渲染。

最后，即使浏览器允许访问本机字体，也不适合把用户系统中安装的所有字体内容都加载给 spx 作为运行时 fallback。普通系统可能安装大量字体，CJK 与 Emoji 字体又往往体积较大；全量读取和注册这些字体会带来明显的启动耗时、内存占用和隐私授权问题。

### 设计方向

字体支持应围绕 Project 建模。

Scratch 兼容、中文或 Emoji 支持、自定义视觉风格，都是某个 Project 需要稳定具备的文本渲染能力。无论作者自己打开、其他用户运行、导出后再导入，Project 都应尽量得到一致的文字效果。

因此，这些能力不适合依赖“当前用户系统中刚好安装了某些字体”，也不适合通过不断向游戏引擎内置更多字体来解决。

Project 应当自己声明运行时可用的字体，以及文本渲染时不同字体的 fallback 优先级。Project 需要使用某个字体时，应当显式把它作为 Project 内容的一部分：要么引用 XBuilder 提供的预置字体，要么把字体文件作为自定义字体加入 Project 的 Game 内容。

## 基本概念

* 字体族 Font Family
* 字体集合 Font Collection
* 字体偏好 Font Preferences
* XBuilder 预置字体 XBuilder Preset Font
* spx 默认字体 spx Default Font

### 字体族 Font Family

Font Family 是 Project 中可被文本渲染逻辑通过名字引用的一组字体。

一个 Font Family 包含：

* Name: Font Family 在所属 Project 内的唯一名字
* Font Faces: 一个或多个 Font Face

Font Face 描述 Font Family 内一组字体文件及其选用条件。选用条件可以包括字重、样式、格式或其他用于选择具体字体文件的信息。

Font Family 是 Project Resource。未来代码、SVG 文本、重命名、引用检查等机制都可以基于 Name 引用 Font Family。

### 字体集合 Font Collection

Font Collection 是 Project 全局可用的 Font Family 集合，是 Project 的 Game 内容的一部分。

只有出现在项目的 Font Collection 中的 Font Family，才可以被 Project 中的 Font Preferences 引用。

由于 Web 运行时无法可靠地直接使用用户系统中已安装的字体，Font Collection 不包含系统字体名或任意 Web 字体 URL。用户希望使用系统中的某个字体时，需要把对应字体文件作为自定义字体添加到 Project 中。

### 字体偏好 Font Preferences

Font Preferences 是一个有序的 Font Family 名字列表，用于描述文本内容渲染时的 fallback 优先级。

例如：

```text
open-sans, basic-chinese, basic-emoji
```

当一段文本中同时包含英文、中文与 Emoji 时，spx 应按照该列表对文本进行 grapheme cluster 级别的 fallback：优先尝试 `open-sans`，当某个 grapheme cluster 无法由 `open-sans` 渲染时，再尝试 `basic-chinese`，然后尝试 `basic-emoji`。

字体 fallback 的粒度应尽量接近浏览器文字渲染机制。对于 Emoji ZWJ 序列、变体选择符、组合音标等情况，fallback 不应简单按单个 Unicode code point 拆分，而应以 grapheme cluster 为基本单位。

Project 拥有一份全局 Font Preferences。默认情况下，Project 中所有文本都使用这份全局 Font Preferences。

Project 中具体的 UI 元素也可以定义自己的 Font Preferences。例如 SVG 中的 `<text>` 元素可以通过 `font-family` 指定自己的 Font Preferences；未来 Monitor 等内容也可能允许配置自己的 Font Preferences。

Font Preferences 中的名字可以引用两类对象：

1. 项目的 Font Collection 中的 Font Family，如 `basic-chinese`
2. spx Default Font 的保留名字 `default`

### XBuilder 预置字体 XBuilder Preset Font

XBuilder Preset Font 是 XBuilder 平台提供给 Project 选择的 Font Family。

它们用于解决常见但不适合无条件内置进 spx 的字体需求，如基础中文、基础 Emoji 等。

XBuilder Preset Font 的关键特点是：

* 它们由 XBuilder 平台提供，不需要用户手动上传。
* 它们被 Project 引用后，会成为项目的 Font Collection 中的 Font Family。
* 不同 XBuilder 部署可以有不同的默认策略。例如国内部署的 XBuilder 项目默认包含基础中文字体，海外部署的 XBuilder 项目默认不包含。

因此，XBuilder Preset Font 是一种 Project 内容。它们不是 spx 运行时天然拥有的字体。

### spx 默认字体 spx Default Font

spx Default Font 是 spx 运行时保证存在的 Font Family，使用保留名字 `default` 表示。

它和 XBuilder Preset Font 不同：

* spx Default Font 不属于项目的 Font Collection。
* spx Default Font 不是 Project Resource，不参与重命名和资源管理。
* spx Default Font 对应的字体文件由 spx 运行时提供，不进入 Project 的 Game 内容。
* spx Default Font 不参与 Project 的保存、发布、导入导出或运行时注入。
* spx Default Font 可以被 Font Preferences 或具体文本内容通过保留名字 `default` 引用，并且在引用检查中应被视为合法引用。

spx Default Font 只提供最基础的兜底能力。Project 需要中文、Emoji 或 Scratch 字体兼容时，仍应通过项目的 Font Collection 引用对应的 XBuilder Preset Font 或自定义字体。

## 核心机制

### 作用范围

Font Collection 与 Font Preferences 影响 Project 中所有文本内容，包括：

1. Widget 中的文本，如 Monitor 的 Label 与 Value
2. 作为 Costume / Backdrop 的 SVG 图片中的文本
3. 将来支持的其他包含文字的游戏 UI 元素

编辑器预览与最终运行时应共享同一套 Font Collection 与 Font Preferences 语义。也就是说，Costume / Backdrop 缩略图、舞台预览、运行画面中同一份文本应尽量得到一致的字体 fallback 结果。

### Font Preferences 的覆盖

Project 的全局 Font Preferences 可以被更细粒度的文本设置覆盖。

例如，SVG 中的 `<text>` 元素可以通过 `font-family` 指定自己的 Font Preferences：

```svg
<text font-family="Scratch, basic-chinese">Hello 你好</text>
```

当某个元素指定了自己的字体列表后，该列表覆盖继承到的全局 Font Preferences。解析规则如下：

1. 按列表顺序查找可用 Font Family
2. 只保留可用 Font Family
3. 使用保留下来的 Font Family 列表进行 fallback
4. 如果列表中没有任何可用 Font Family，则该元素没有可用字体，不再回退到 Project 全局 Font Preferences

因此，如果 SVG 写的是：

```text
font-family="A, B, sans-serif"
```

而 `A`、`B`、`sans-serif` 都不可用，那么这段文本不会继续使用 Project 全局 Font Preferences。

如果希望某段文本在指定字体不可用时仍回到 spx Default Font，需要显式写入 `default`：

```text
font-family="A, B, default"
```

当所有可用字体都无法渲染某个 grapheme cluster 时，运行时显示缺字框。

### 加载机制

项目的 Font Collection 中的字体文件与 Project 中的其他 Game 内容文件一样参与保存、发布、导入导出与运行时注入。spx Default Font 除外，它由 spx 运行时提供，不进入 Project 的 Game 内容。

在运行 Project 时，XBuilder 将 Project 依赖的字体文件与其他 Game 内容文件一起提供给 spx。spx 在游戏启动阶段加载并注册项目的 Font Collection 中的字体，然后按照 Font Collection、Font Preferences 和 spx Default Font 的保留语义渲染文本。

当前策略是运行时一次性加载 Project 依赖的全部字体。未来可以根据字体体积、文本使用情况与运行时能力，优化为运行过程中延迟加载。

## User Story

### 导入 Scratch 项目

用户导入 Scratch 项目后，项目中的 SVG 造型或背景可能继续引用 Scratch 特有字体。

Scratch 项目导入时，转换工具应负责把 Scratch 项目依赖的字体添加到项目包中，并把它们作为 Font Family 加入项目的 Font Collection。XBuilder 不需要专门感知这些字体来自 Scratch；它只需要按照普通 Font Family 处理。

这样，Scratch SVG 中通过 `font-family` 指定的 Font Family 名字，只要存在于项目的 Font Collection 中，就可以在 XBuilder 与 spx 运行时中生效。

### 在项目中使用中文或 Emoji

用户在 Monitor、SVG 文本或其他文本元素中输入中文或 Emoji。

Project 可以通过 Font Preferences 引用基础中文字体、基础 Emoji 字体等 XBuilder Preset Font。由于这些字体按需加入 Project，支持更多语言或 Emoji 不会无条件增加 spx 引擎体积。

除了基于 XBuilder 部署版本默认引入基础中文字体外，未来 XBuilder 也可以在项目编辑器中允许用户显式配置“项目是否需要支持中文”或“项目是否需要支持 Emoji”。具体 UI 设计细节待定。

### 使用自定义字体

长期来看，用户可能希望项目拥有特定视觉风格，可以将字体文件添加为 Project Font Family，并把它加入全局 Font Preferences，或在某些 SVG / 文本元素中通过名字单独引用。

XBuilder 可以提供满足这类需求的 UI，帮助用户添加字体文件、组织 Font Family，并调整全局或局部 Font Preferences。具体 UI 设计细节待定。

Project 保存、发布或导出时，自定义字体文件随项目一起保存，确保其他用户打开或运行该 Project 时看到一致的文本效果。
