# spx-gui

## Dependency Installation

```bash
npm install
```

## Project Execution

```bash
npm run dev
```

## Project DevTool

`vite-plugin-vue-devtools` <https://devtools-next.vuejs.org/>  

DevTool will run in `localhost:5173/__devtools__/`

## Code Architecture

```arduino
├── public 
└── src 
    ├── api          // Requests
    ├── assets       // Resource files
    ├── components   // Components
    ├── router       // Routing
    ├── store        // State/Storage Management
        ├── modules  // State Modules
    └── util         // Utils
```

## Development Standards

### Code Styles

#### Naming Convention

- For variables/functions/types: follow ESLint rule `@typescript-eslint/naming-convention`. For things "defining the shape" like class, interface, etc., use CamelCase. For "instances" like a regular variable, use camelCase.
- For filenames/folders: use CamelCase for Vue component files, use kebab-case for others.

#### Exports

- Use default export for Vue components. Use named export for all other cases.

#### Type Checks

- Do not ignore TypeScript errors. Try not to use `any`.
- Type Checks are run on PR (`vue-tsc`).

#### ESLint Rules

- ESLint rules can be ignored in some cases, but with Code Review.
- ESLint is run on PR.

#### Format

- Install extension Prettier to format your code. Format on PR for changed files is required. You can also turn on the feature Format on Save in VSCode.

### Component Standards

1. CamelCase naming
2. The order of tags is unified as `<script>, <template>, <style>`
3. Use the Composition API for coding
4. defineProps should use type declaration
5. Child components that are tightly coupled with the parent component should be prefixed with the parent component's name, e.g., SpriteList, SpriteListItem, SpriteListItemButton

#### Examples

Here is a complete example of a component named SpriteList:

```vue
<template>
  <div>Display SpriteList</div>
</template>

<script setup>
// ----------Import required packages / components-----------
import { computed, onMounted } from 'vue'

// ----------props & emit------------------------------------
const props = defineProps({ spriteName: String }) // Props based on type declaration
const emit = defineEmits(['update'])

// ----------data related (reactive, ref..)------------------
const count = ref(0)

// ----------computed properties-----------------------------
const doubled = computed(() => count.value * 2)

// ----------lifecycle hooks---------------------------------
onMounted(() => {
  console.log('Component is mounted!')
})

// ----------other composition functions---------------------
// Such as useRouter, useStore..

// ----------methods-----------------------------------------
</script>
```

### Store Standards

1. The returned value of `defineStore()`is named using the name of store.
2. This value needs to start with `use` and end with `Store`. for example, `useAssetStore`, `useUserStore`, `useStyleStore`
3. The first parameter is the unique ID of the Store in the application
3. Use `Setup Store` to write Store
4. Read-only properties in store are exposed after being wrapped with `vue.readonly`

```js
export const useUserStore = defineStore('user', () => {
  // ----------state------------------------------------
  const token = ref('')
  const username = ref('')

  // ----------getters------------------------------------
  const getFullToken = computed(() => 'Bear ' + token.value)

  // ----------actions------------------------------------
  const setToken = (_token) => {
    token.value = _token
  }
  return {
    //  state
    username: readonly(username),
    token: readonly(token),
    //  getters
    getFullToken,
    //  actions
    setToken,
  }
})
```

### Route Addition

Adding SpriteList as an example:

```javascript
const routes = [
  { path: '/', redirect: '/spx/homepage' },
  {
    path: '/spx/homepage',
    name: 'SpxHomepage',
    component: () => import('../components/SpxHomepage.vue'),
  },
  {
    path: '/sprite/list',
    name: 'SpriteList',
    component: () => import('../components/sprite-list/SpriteList.vue'),
  },
]
```

1. Enter `[project deployment URL]/sprite/list` in the browser address bar to access the component page

### Team Work Standards

Use TODO for team code handover

```vue
<script setup>

// TODO Complete xx content writing/bugfix  @xxx

</script>
```

## Complete Component Development Process Reference

Taking the creation of an Audio Editing Page as an example:

1. If it's a new page, create a folder, sounds-edit
2. Create SoundEdit.vue component
3. Register the component in the route
4. Complete the page development

## Theme File

If your project includes custom CSS styles with color definitions, follow these steps to define these styles in a theme file:

1. Add custom color variables in the file located at src/assets/theme.scss

```scss
// SpxEditor  
$spx-editor-tab-font-uncheck: black;   // Please start the name with the component name, for example, for CSS styles in SpxEditor, start with spx-editor
```

2. Import and use these variables in SpxEditor

```scss
<style scoped lang="scss">  
@import "@/assets/theme.scss";  

.tab-font-uncheck {  
  font-size: 20px;  
  color: $spx-editor-tab-font-uncheck;  
}
  
</style>
```

## i18n/i10n

### Configure languages in `src/language/index.ts`

```typescript
export const initI18n = async (app: App) => {
  const messages = {
    en: {
      sounds: {
        hint: 'Sounds',
      },
    },
    zh: {
      sounds: {
        hint: '音频',
      },
    },
  }
}
```

### Usage

```html
<div class="sounds-hint">{{ $t('sounds.hint') }}</div>
```