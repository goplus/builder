# Radar

The Radar module provides a mechanism to discover & manipulate UI elements in the application.

### Installation

```ts
import { createRadar } from '@/utils/radar'

app.use(createRadar())
```

### Marking Elements

To mark an element for radar, use the `v-radar` directive:

```html
<a v-radar="{ name: 'logo-link', desc: 'Logo image as link to the homepage' }">
  <!-- Logo image -->
</a>
```

### Accessing Radar Instance

You can access the radar instance using the `useRadar` composable:

```ts
import { useRadar } from '@/utils/radar'

const radar = useRadar()
const rootNodes = radar.getRootNodes()
const node = radar.getNodeById('some-node-id')
const children = node.getChildren()
const button = radar.select('project-editor save-button')
const buttons = radar.selectAll('project-editor save-button')
```

### Tree ordering and reactivity

`getRootNodes()` and `getChildren()` return a new snapshot in the current DOM
document order. Do not treat a returned array as a reactive source of later DOM
reordering: Radar currently does not observe reordering continuously.

This keeps Radar lightweight for its current query-oriented uses and avoids the
cost of globally observing DOM mutations. If a future consumer needs a
reactively observed UI tree, we can reconsider adding that capability.

### Metadata

`name` is a stable semantic UI role and must match
`[a-z][a-z0-9]*(?:-[a-z0-9]+)*`. It must not contain a user-supplied or other
open-ended value. Use `attrs` for a concrete node's dynamic identity instead;
attribute names follow the same kebab-case rule, and attributes whose value is
`null` or `undefined` are ignored.

`label` is optional. By default Radar converts the name to readable text and,
when `attrs.name` is present, appends that value in quotes. For example,
`sound-item` with `{ name: 'meow' }` becomes `Sound item "meow"`. Supply
`label` only when this default is not appropriate. The generated label is
sentence-cased, so `api-reference` becomes `Api reference`; supply `label`
when a different capitalization, such as `API Reference`, is needed.

```html
<div v-radar="{ name: 'sound-item', desc: 'A project sound', attrs: { name: sound.name } }"></div>
```

### Business UI metadata guide

Mark UI elements that have a meaningful role in a user task: a panel, a
repeated item, or an action the user may need to find. Do not add Radar
metadata solely to mirror every DOM wrapper.

- `name` identifies the stable UI role. Use a concise kebab-case noun, or a
  noun with its role: `costume-item`, `save-button`, `sprite-editor`. The name
  is shared by equivalent instances; never interpolate a user value into it.
  Interpolating a closed application enum is appropriate, for example
  `` `${selected.type}-editor` `` for `sprite`, `stage`, and `empty` editors.
- `attrs` distinguishes repeated or dynamic instances. Prefer stable domain
  fields and kebab-case keys. `attrs.name` is the usual choice for an item
  named by the user. Include only fields needed to select the specific
  instance; nullish fields can be passed directly and Radar ignores them.
- `label` overrides the accessible label that Radar writes as `aria-label`.
  Usually omit it and use the derived label. Supply it when the UI has a more
  useful readable label than the role plus `attrs.name`, such as an API's full
  signature.
- `desc` is written as `aria-description`. Describe the action or context that
  is not apparent from the label; use `''` when it adds no useful information.

For a static action, only the role and action description are needed:

```html
<UIButton v-radar="{ name: 'save-button', desc: 'Save the current project' }">Save</UIButton>
```

For an item in a user-named list, keep the role stable and put the name in an
attribute. This yields the selector `costume-item[name="hero"]` and the default
accessible label `Costume item "hero"`.

```html
<UIEditorSpriteItem v-radar="{ name: 'costume-item', desc: 'Project costume', attrs: { name: costume.name } }" />
```

### Selector strings

`select` and `selectAll` accept the following grammar:

```text
selector       = compound, { whitespace, compound } ;
compound       = name, { attribute } ;
attribute      = "[", attribute-name, "=", JSON-string, "]" ;
name           = kebab-case-identifier ;
attribute-name = kebab-case-identifier ;
```

Whitespace is a descendant combinator: each later compound can match any Radar
descendant of the preceding match, even if non-Radar DOM elements are between
them. Name and attribute comparisons are exact and case-sensitive. Attribute
values are JSON strings, so use JSON escaping for a quote or backslash.

Selectors deliberately do not support direct-child combinators, wildcards,
lists, pseudo-classes, attribute-presence checks, or partial attribute matches.

```ts
radar.selectAll('sound-item[name="meow"]')
radar.selectAll('api-references api-reference[name="Sprite.stepTo"][overload-id="1"]')
```

Malformed selectors throw `RadarSelectorSyntaxError`. `select` returns the
first visible match in document order, or `null`; `selectAll` returns every
visible match in document order.
