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
const buttons = radar.selectAll('project-editor save-button')
```

### Metadata

`name` is a stable semantic UI role and must match
`[a-z][a-z0-9]*(?:-[a-z0-9]+)*`. It must not contain a user-supplied or other
open-ended value. Use `attrs` for a concrete node's dynamic identity instead;
attribute names follow the same kebab-case rule, and attributes whose value is
`null` or `undefined` are ignored.

`label` is optional. By default Radar converts the name to readable text and,
when `attrs.name` is present, appends that value in quotes. For example,
`sound-item` with `{ name: 'meow' }` becomes `Sound item "meow"`. Supply
`label` only when this default is not appropriate.

```html
<div v-radar="{ name: 'sound-item', desc: 'A project sound', attrs: { name: sound.name } }"></div>
```

### Selector strings

`selectAll` accepts the following grammar:

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

Malformed selectors throw `RadarSelectorSyntaxError`; valid selectors with no
matches return an empty array. Matches are visible nodes, in document order.
