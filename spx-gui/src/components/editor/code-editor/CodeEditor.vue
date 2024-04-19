<template>
  <div class="code-editor">
    <ul class="categories-wrapper">
      <li
        v-for="(category, i) in categories"
        :key="i"
        class="category"
        :class="{ active: category === activeCategory }"
        :style="{ '--category-color': category.color }"
        @click="handleCategoryClick(category)"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="icon" v-html="category.icon"></div>
        <p class="label">{{ $t(category.label) }}</p>
      </li>
    </ul>
    <div class="snippets-wrapper">
      <h4 class="title">{{ $t(activeCategory.label) }}</h4>
      <div class="snippets">
        <UITag
          v-for="(snippet, i) in activeCategory.snippets"
          :key="i"
          :title="snippet.detail"
          @click="handleSnippetClick(snippet)"
        >
          {{ snippet.label }}
        </UITag>
      </div>
    </div>
    <div class="code-text-editor-wrapper">
      <CodeTextEditor
        ref="codeTextEditor"
        :value="value"
        @update:value="(v) => emit('update:value', v)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { useUIVariables, UITag } from '@/components/ui'
import {
  CodeTextEditor,
  motionSnippets,
  eventSnippets,
  lookSnippets,
  controlSnippets,
  soundSnippets,
  type Snippet
} from './code-text-editor'
import iconEvent from './icons/event.svg?raw'
import iconLook from './icons/look.svg?raw'
import iconMotion from './icons/motion.svg?raw'
import iconSound from './icons/sound.svg?raw'
import iconControl from './icons/control.svg?raw'

defineProps<{
  value: string
}>()

const emit = defineEmits<{
  'update:value': [value: string]
}>()

const uiVariables = useUIVariables()

const categories = [
  {
    icon: iconEvent,
    label: { en: 'Event', zh: '事件' },
    snippets: eventSnippets,
    color: uiVariables.color.yellow.main
  },
  {
    icon: iconLook,
    label: { en: 'Look', zh: '外观' },
    snippets: lookSnippets,
    color: '#fd8d60'
  },
  {
    icon: iconSound,
    label: { en: 'Sound', zh: '声音' },
    snippets: soundSnippets,
    color: uiVariables.color.purple.main
  },
  {
    icon: iconMotion,
    label: { en: 'Motion', zh: '运动' },
    snippets: motionSnippets,
    color: '#91d644'
  },
  {
    icon: iconControl,
    label: { en: 'Control', zh: '控制' },
    snippets: controlSnippets,
    color: '#67ceff'
  }
]

const activeCategory = shallowRef(categories[0])

function handleCategoryClick(category: (typeof categories)[0]) {
  activeCategory.value = category
}

const codeTextEditor = ref<InstanceType<typeof CodeTextEditor>>()

function handleSnippetClick(snippet: Snippet) {
  codeTextEditor.value?.insertSnippet(snippet)
}

defineExpose({
  async format() {
    await codeTextEditor.value?.format()
  }
})
</script>

<style scoped lang="scss">
.code-editor {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  justify-content: stretch;
}

.categories-wrapper {
  flex: 0 0 auto;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category {
  width: 64px;
  height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--ui-border-radius-1);
  color: var(--category-color);
  cursor: pointer;

  &.active {
    color: var(--ui-color-grey-100);
    background-color: var(--category-color);
    cursor: default;
  }

  .icon {
    width: 24px;
    height: 24px;
  }

  .label {
    margin-top: 2px;
    text-align: center;
  }
}

.snippets-wrapper {
  flex: 0 1 180px; /* TODO: check size here */
  padding: 12px;
  background-color: var(--ui-color-grey-300);

  .title {
    font-size: var(--ui-font-size-text);
    color: var(--ui-color-title);
  }

  .snippets {
    margin-top: 12px;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
}

.code-text-editor-wrapper {
  flex: 1 1 400px;
  min-width: 0;
  padding: 12px;
}
</style>