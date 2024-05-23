<template>
  <div class="code-editor">
    <ul class="categories-wrapper">
      <li
        v-for="(category, i) in categories"
        v-show="category.snippets.length > 0"
        :key="i"
        class="category"
        :class="{ active: i === activeCategoryIndex }"
        :style="{ '--category-color': category.color }"
        @click="handleCategoryClick(i)"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="icon" v-html="category.icon"></div>
        <p class="label">{{ $t(category.label) }}</p>
      </li>
    </ul>
    <div class="snippets-wrapper">
      <h4 class="title">{{ $t(activeCategory.label) }}</h4>
      <div v-for="(snippets, i) in activeCategory.snippets" :key="i" class="snippets">
        <UITooltip v-for="(snippet, j) in snippets" :key="j">
          {{ $t(snippet.desc) }}
          <template #trigger>
            <UITagButton @click="handleSnippetClick(snippet)">
              <span class="snippet-text">{{ snippet.label }}</span>
            </UITagButton>
          </template>
        </UITooltip>
      </div>
    </div>
    <div class="code-text-editor-wrapper">
      <CodeTextEditor
        ref="codeTextEditor"
        :value="value"
        @update:value="(v) => emit('update:value', v)"
      />
    </div>
    <UIImg class="thumbnail" :src="thumbnailSrc" />
    <UILoading :visible="loading" cover />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useUIVariables, UITagButton, UITooltip, UIImg, UILoading } from '@/components/ui'
import { useEditorCtx } from '../EditorContextProvider.vue'
import {
  CodeTextEditor,
  motionSnippets,
  eventSnippets,
  lookSnippets,
  controlSnippets,
  soundSnippets,
  type Snippet,
  SnippetTarget,
  sensingSnippets,
  gameSnippets,
  getVariableSnippets
} from './code-text-editor'
import iconEvent from './icons/event.svg?raw'
import iconLook from './icons/look.svg?raw'
import iconMotion from './icons/motion.svg?raw'
import iconSound from './icons/sound.svg?raw'
import iconControl from './icons/control.svg?raw'
import { useFileUrl } from '@/utils/file'

withDefaults(
  defineProps<{
    loading?: boolean
    value: string
  }>(),
  {
    loading: false
  }
)

const emit = defineEmits<{
  'update:value': [value: string]
}>()

const uiVariables = useUIVariables()
const editorCtx = useEditorCtx()

const variablesSnippets = computed(() => getVariableSnippets(editorCtx.project))

const categories = computed(() => {
  return [
    {
      icon: iconEvent,
      color: uiVariables.color.yellow.main,
      label: { en: 'Event', zh: '事件' },
      snippets: eventSnippets
    },
    {
      icon: iconControl,
      color: '#67ceff',
      label: { en: 'Control', zh: '控制' },
      snippets: controlSnippets
    },
    {
      icon: iconMotion,
      color: '#91d644',
      label: { en: 'Motion', zh: '运动' },
      snippets: motionSnippets
    },
    {
      icon: iconLook,
      color: '#fd8d60',
      label: { en: 'Look', zh: '外观' },
      snippets: lookSnippets
    },
    {
      icon: iconLook, // TODO
      color: '#fd8d60',
      label: { en: 'Sensing', zh: '感知' },
      snippets: sensingSnippets
    },
    {
      icon: iconSound,
      color: uiVariables.color.sound.main,
      label: { en: 'Sound', zh: '声音' },
      snippets: soundSnippets
    },
    {
      icon: iconControl, // TODO
      color: '#67ceff',
      label: { en: 'Variable', zh: '变量' },
      snippets: variablesSnippets.value
    },
    {
      icon: iconControl, // TODO
      color: '#67ceff',
      label: { en: 'Game', zh: '游戏' },
      snippets: gameSnippets
    }
  ].map((c) => ({ ...c, snippets: filterSnippets(c.snippets) }))
})

function filterSnippets(snippets: Snippet[][]) {
  const isSprite = editorCtx.project.selected?.type === 'sprite'
  if (isSprite) return snippets
  // for stage, filter snippets that targets sprite only
  return snippets
    .map((ss) => ss.filter((s) => s.target === SnippetTarget.all))
    .filter((ss) => ss.length > 0)
}

const activeCategoryIndex = shallowRef(0)
const activeCategory = computed(() => categories.value[activeCategoryIndex.value])

function handleCategoryClick(index: number) {
  activeCategoryIndex.value = index
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

const [thumbnailSrc] = useFileUrl(() => {
  const project = editorCtx.project
  if (project.selected?.type === 'stage') return project.stage.defaultBackdrop?.img
  if (project.selectedSprite) return project.selectedSprite.defaultCostume?.img
})
</script>

<style scoped lang="scss">
.code-editor {
  position: relative;
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
  // 162px is the max width of snippet buttons, use 162px as base width
  // to keep snippets-wrapper's width stable when switch among different snippet categories
  flex: 1 0 162px;
  padding: 12px;
  background-color: var(--ui-color-grey-300);
  overflow-y: auto;

  .title {
    font-size: var(--ui-font-size-text);
    color: var(--ui-color-title);
  }

  .snippets {
    margin: 12px 0;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;

    + .snippets {
      // TODO: need design
      padding-top: 12px;
      border-top: 1px dashed var(--ui-color-dividing-line-1);
    }
  }

  .snippet-text {
    max-width: 9em;
    overflow-x: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.code-text-editor-wrapper {
  flex: 5 1 300px;
  min-width: 0;
  padding: 12px;
}

.thumbnail {
  flex: 0 0 auto;
  margin-right: 12px;
  margin-top: 12px;
  width: 60px;
  height: 60px;
  opacity: 0.3;
}
</style>
