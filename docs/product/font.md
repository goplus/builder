# Font

Projects in XBuilder may contain multiple kinds of text, including text in widgets such as monitors, text in SVG images used as costumes or backdrops, and text in more game UI elements in the future.

## Background

### Requirements

Text rendering needs to address several kinds of requirements:

* Scratch project compatibility. SVG images in Scratch projects may use Scratch-specific fonts.
* Chinese text support, and broader language support as XBuilder becomes more internationalized.
* Emoji support. Emoji font sizes and formats vary significantly, so they are not suitable to be unconditionally built into the engine. For example, Noto Color Emoji font files are usually around 9 MB to 24 MB; even the smaller Twemoji Mozilla font is about 1.4 MB uncompressed, and its coverage, format, and rendering compatibility are different from Noto Color Emoji.
* In the long term, support custom project fonts so projects can provide a specific visual style.

### Web Runtime Constraints

In the Web runtime, it is hard for XBuilder to directly use fonts already installed on the user's system as the text rendering capability of a project.

First, browsers do not provide stable, cross-browser access to system fonts. The Local Font Access API can enumerate local fonts and read font data after user authorization, but it is still experimental and mainly supported by desktop Chromium. It is not suitable as a foundation for XBuilder's font design.

Second, the XBuilder game runtime does not render text directly through browser DOM / CSS. It renders game content through spx / Godot Web. For such a runtime, knowing a system font name is usually not enough; spx needs the font file content, or equivalent font data such as glyphs, metrics, and OpenType tables, to perform text layout and rendering at runtime.

Finally, even if the browser allowed access to local fonts, loading all fonts installed on the user's system into spx as runtime fallback would not be appropriate. A normal system may have many fonts installed, and CJK and Emoji fonts are often large. Reading and registering all of them would introduce significant startup time, memory usage, and privacy authorization costs.

### Design Direction

Font support should be modeled around the project.

Scratch compatibility, Chinese or Emoji support, and custom visual styles are all text rendering capabilities that a specific project needs to have reliably. Whether the author opens the project, another user runs it, or the project is exported and imported again, the project should get consistent text results as much as possible.

Therefore, these capabilities should not depend on fonts that happen to be installed on the current user's system. They also should not be solved by continuously adding more fonts directly into the game engine.

A project should declare which fonts are available at runtime, and the fallback priority among those fonts. When a project needs to use a font, it should explicitly make that font part of the project content: either by referencing a preset font provided by XBuilder, or by adding font files as custom fonts to the project's Game content.

## Basic Concepts

* Font Family
* Font Collection
* Font Preferences
* XBuilder Preset Font
* spx Default Font

### Font Family

A Font Family is a group of fonts in a project that text rendering logic can reference by name.

A Font Family contains:

* Name: the unique name of the Font Family within its project
* Font Faces: one or more Font Faces

A Font Face describes a group of font files inside a Font Family and the conditions for selecting them. Selection conditions may include weight, style, format, or other information used to choose the concrete font file.

Font Family is a Project Resource. Future code, SVG text, renaming, reference checking, and related mechanisms can reference a Font Family by Name.

### Font Collection

Font Collection is the set of Font Families globally available to a project. It is part of the project's Game content.

Only Font Families in the project's Font Collection can be referenced by Font Preferences in the project.

Because the Web runtime cannot reliably use fonts installed on the user's system directly, Font Collection does not contain system font names or arbitrary Web font URLs. If users want to use a font from their system, they need to add the corresponding font files to the project as custom fonts.

### Font Preferences

Font Preferences is an ordered list of Font Family names. It describes the fallback priority for text rendering.

For example:

```text
open-sans, basic-chinese, basic-emoji
```

When a piece of text contains English, Chinese, and Emoji at the same time, spx should perform fallback at the grapheme cluster level according to this list: first try `open-sans`; when a grapheme cluster cannot be rendered by `open-sans`, try `basic-chinese`; then try `basic-emoji`.

The fallback granularity should be as close as possible to browser text rendering behavior. For Emoji ZWJ sequences, variation selectors, combining marks, and similar cases, fallback should not simply split text by individual Unicode code points. It should use grapheme clusters as the basic unit.

A project has one global Font Preferences. By default, all text in the project uses this global Font Preferences.

Specific UI elements in a project may also define their own Font Preferences. For example, a `<text>` element in SVG can use `font-family` to specify its own Font Preferences; in the future, content such as monitors may also be allowed to configure their own Font Preferences.

Names in Font Preferences can reference two kinds of objects:

1. Font Families in the project's Font Collection, such as `basic-chinese`
2. The reserved name `default` for spx Default Font

### XBuilder Preset Font

XBuilder Preset Font is a Font Family provided by the XBuilder platform for projects to choose.

It is used for common font requirements that should not be unconditionally built into spx, such as basic Chinese or basic Emoji support.

XBuilder Preset Font has the following key properties:

* It is provided by the XBuilder platform, so users do not need to upload it manually.
* After a project references it, it becomes a Font Family in the project's Font Collection.
* Different XBuilder deployments can have different default policies. For example, projects created in a mainland China deployment of XBuilder include the basic Chinese font by default, while projects created in an overseas deployment do not.

Therefore, XBuilder Preset Font is a kind of project content. It is not a font that the spx runtime naturally owns.

### spx Default Font

spx Default Font is a Font Family guaranteed to exist in the spx runtime. It is represented by the reserved name `default`.

It is different from XBuilder Preset Font:

* spx Default Font does not belong to the project's Font Collection.
* spx Default Font is not a Project Resource, and does not participate in renaming or resource management.
* The font file for spx Default Font is provided by the spx runtime and does not enter the project's Game content.
* spx Default Font does not participate in project saving, publishing, import / export, or runtime injection.
* spx Default Font can be referenced by Font Preferences or concrete text content through the reserved name `default`, and should be considered a valid reference during reference checking.

spx Default Font only provides the most basic fallback capability. When a project needs Chinese, Emoji, or Scratch font compatibility, it should still reference the corresponding XBuilder Preset Font or custom font through the project's Font Collection.

## Core Mechanisms

### Scope

Font Collection and Font Preferences affect all text content in a project, including:

1. Text in widgets, such as the Label and Value of a monitor
2. Text in SVG images used as costumes or backdrops
3. Other game UI elements that contain text in the future

Editor preview and final runtime should share the same Font Collection and Font Preferences semantics. In other words, the same text in costume / backdrop thumbnails, stage preview, and runtime rendering should get consistent font fallback results as much as possible.

### Font Preferences Override

The global Font Preferences of a project can be overridden by more granular text settings.

For example, a `<text>` element in SVG can use `font-family` to specify its own Font Preferences:

```svg
<text font-family="Scratch, basic-chinese">Hello 你好</text>
```

When an element specifies its own font list, that list overrides the inherited global Font Preferences. The parsing rules are:

1. Look up available Font Families in list order
2. Keep only available Font Families
3. Use the kept Font Family list for fallback
4. If the list contains no available Font Family, the element has no available font and does not fall back to the project's global Font Preferences

Therefore, if SVG contains:

```text
font-family="A, B, sans-serif"
```

and `A`, `B`, and `sans-serif` are all unavailable, this text will not continue to use the project's global Font Preferences.

If text should fall back to spx Default Font when the specified fonts are unavailable, `default` needs to be written explicitly:

```text
font-family="A, B, default"
```

When all available fonts fail to render a grapheme cluster, the runtime displays a missing glyph box.

### Loading

Font files in the project's Font Collection participate in saving, publishing, import / export, and runtime injection in the same way as other Game content files in the project. spx Default Font is the exception: it is provided by the spx runtime and does not enter the project's Game content.

When running a project, XBuilder provides the font files that the project depends on to spx together with other Game content files. During game startup, spx loads and registers fonts in the project's Font Collection, and then renders text according to Font Collection, Font Preferences, and the reserved semantics of spx Default Font.

The current strategy is to load all fonts that the project depends on at runtime startup. In the future, this may be optimized to lazy loading during runtime based on font size, text usage, and runtime capability.

## User Story

### Import a Scratch Project

After a user imports a Scratch project, SVG costumes or backdrops in the project may continue to reference Scratch-specific fonts.

When importing a Scratch project, the conversion tool should add the fonts that the Scratch project depends on to the project package, and add them as Font Families to the project's Font Collection. XBuilder does not need to specially recognize that these fonts come from Scratch; it only needs to treat them as ordinary Font Families.

This way, as long as the Font Family names specified by `font-family` in Scratch SVG exist in the project's Font Collection, they can take effect in XBuilder and the spx runtime.

### Use Chinese or Emoji in a Project

Users enter Chinese or Emoji in monitors, SVG text, or other text elements.

A project can reference XBuilder Preset Fonts such as basic Chinese fonts and basic Emoji fonts through Font Preferences. Because these fonts are added to the project on demand, supporting more languages or Emoji does not unconditionally increase the size of the spx engine.

In addition to including the basic Chinese font by default based on the XBuilder deployment version, XBuilder may also allow users to explicitly configure whether the project needs Chinese support or Emoji support in the project editor. The concrete UI design details are to be decided.

### Use Custom Fonts

In the long term, users may want a project to have a specific visual style. They can add font files as project Font Families, add them to the global Font Preferences, or reference them by name in certain SVG / text elements.

XBuilder can provide UI for this need, helping users add font files, organize Font Families, and adjust global or local Font Preferences. The concrete UI design details are to be decided.

When the project is saved, published, or exported, custom font files are saved together with the project, so other users can see consistent text results when opening or running the project.
