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

### Metadata and selectors

`name` is a stable kebab-case UI role. Use `attrs` for dynamic instance values;
nullish attribute values are ignored. Radar derives an accessible label from
the name and `attrs.name`, unless `label` is provided.

```html
<div v-radar="{ name: 'sound-item', desc: 'A project sound', attrs: { name: sound.name } }"></div>
```

Selectors use exact, case-sensitive name and attribute matches. Whitespace
selects descendants. Attribute values are JSON strings.

```ts
radar.selectAll('sound-item[name="meow"]')
radar.selectAll('api-references api-reference[name="Sprite.stepTo"][overload-id="1"]')
```

Malformed selectors throw `RadarSelectorSyntaxError`; valid selectors with no
matches return an empty array.
