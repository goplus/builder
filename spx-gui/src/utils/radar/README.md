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
<a v-radar="{ name: 'Logo link', desc: 'Logo image as link to the homepage' }">
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
```
