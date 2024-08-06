<!-- eslint-disable vue/no-v-html -->
<template>
  <div class="code-editor">
    <ul class="categories-wrapper">
      <li
        v-for="(category, i) in categories"
        v-show="category.groups.length > 0"
        :key="i"
        class="category"
        :class="{ active: i === activeCategoryIndex }"
        :style="{ '--category-color': category.color }"
        @click="handleCategoryClick(i)"
      >
        <div class="icon" v-html="category.icon"></div>
        <p class="label">{{ $t(category.label) }}</p>
      </li>
      <li
        class="category"
        style="margin-top: auto"
        @click="documentViewer?.invokeDocumentDetail(DocsOnTouched)"
      >
        <div class="icon" v-html="iconControl"></div>
        <p class="label">文档</p>
      </li>
    </ul>
    <div class="tools-wrapper">
      <h4 class="title">{{ $t(activeCategory.label) }}</h4>
      <div v-for="(group, i) in activeCategory.groups" :key="i" class="def-group">
        <h5 class="group-title">{{ $t(group.label) }}</h5>
        <div class="defs">
          <ToolItem
            v-for="(def, j) in group.tools"
            :key="j"
            :tool="def"
            @use-snippet="handleUseSnippet"
          />
        </div>
      </div>
      <DocumentViewComponent :document-viewer="documentViewer"></DocumentViewComponent>
    </div>

    <div class="code-text-editor-wrapper">
      <CodeTextEditor
        ref="codeTextEditor"
        :value="value"
        @update:value="(v) => emit('update:value', v)"
      />
    </div>
    <div class="extra">
      <UIImg class="thumbnail" :src="thumbnailSrc" />
      <div class="zoomer">
        <button class="zoom-btn" title="Zoom in" @click="handleZoom('in')" v-html="iconZoomIn" />
        <button class="zoom-btn" title="Zoom out" @click="handleZoom('out')" v-html="iconZoomOut" />
        <button
          class="zoom-btn"
          title="Reset"
          @click="handleZoom('initial')"
          v-html="iconZoomReset"
        />
      </div>
    </div>
    <UILoading :visible="loading" cover />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useUIVariables, UIImg, UILoading } from '@/components/ui'
import { useEditorCtx } from '../EditorContextProvider.vue'
import {
  CodeTextEditor,
  motionCategory,
  eventCategory,
  lookCategory,
  controlCategory,
  soundCategory,
  ToolContext,
  sensingCategory,
  gameCategory,
  getVariableCategory,
  type ToolGroup
} from './code-text-editor'
import ToolItem from './ToolItem.vue'
import iconEvent from './icons/event.svg?raw'
import iconLook from './icons/look.svg?raw'
import iconMotion from './icons/motion.svg?raw'
import iconSound from './icons/sound.svg?raw'
import iconControl from './icons/control.svg?raw'
import iconGame from './icons/game.svg?raw'
import iconSensing from './icons/sensing.svg?raw'
import iconVariable from './icons/variable.svg?raw'
import iconZoomIn from './icons/zoom-in.svg?raw'
import iconZoomOut from './icons/zoom-out.svg?raw'
import iconZoomReset from './icons/zoom-reset.svg?raw'
import { useFileUrl } from '@/utils/file'
import { DocumentViewer } from './features/document-viewer/DocumentViewer'
import DocumentViewComponent from './features/document-viewer/DocumentViewComponent.vue'
import DocsOnTouched from './docs/onTouched.md?raw'

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

const documentViewer = new DocumentViewer()
const uiVariables = useUIVariables()
const editorCtx = useEditorCtx()

const variablesDefs = computed(() => getVariableCategory(editorCtx.project))

const categories = computed(() => {
  return [
    {
      icon: iconEvent,
      color: '#fabd2c',
      ...eventCategory
    },
    {
      icon: iconLook,
      color: '#fd8d60',
      ...lookCategory
    },
    {
      icon: iconMotion,
      color: '#91d644',
      ...motionCategory
    },
    {
      icon: iconControl,
      color: '#3fcdd9',
      ...controlCategory
    },
    {
      icon: iconSensing,
      color: '#4fc2f8',
      ...sensingCategory
    },
    {
      icon: iconSound,
      color: uiVariables.color.sound.main,
      ...soundCategory
    },
    {
      icon: iconVariable,
      color: '#5a7afe',
      ...variablesDefs.value
    },
    {
      icon: iconGame,
      color: '#e14e9f',
      ...gameCategory
    }
  ].map((c) => ({ ...c, groups: filterGroups(c.groups) }))
})

function filterGroups(groups: ToolGroup[]) {
  const isSprite = editorCtx.project.selected?.type === 'sprite'
  return groups
    .map((g) => ({
      ...g,
      tools: g.tools.filter((d) => {
        if (d.target === ToolContext.all) return true
        const target = isSprite ? ToolContext.sprite : ToolContext.stage
        return d.target === target
      })
    }))
    .filter((g) => g.tools.length > 0)
}

const activeCategoryIndex = shallowRef(0)
const activeCategory = computed(() => categories.value[activeCategoryIndex.value])

function handleCategoryClick(index: number) {
  activeCategoryIndex.value = index
}

const codeTextEditor = ref<InstanceType<typeof CodeTextEditor>>()

function handleUseSnippet(insertText: string) {
  codeTextEditor.value?.insertSnippet(insertText)
}

function handleZoom(action: 'in' | 'out' | 'initial') {
  codeTextEditor.value?.zoomFont(action)
}

const [thumbnailSrc] = useFileUrl(() => {
  const project = editorCtx.project
  if (project.selected?.type === 'stage') return project.stage.defaultBackdrop?.img
  if (project.selectedSprite) return project.selectedSprite.defaultCostume?.img
})

defineExpose({
  async format() {
    await codeTextEditor.value?.format()
  }
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
  padding: 12px 4px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category {
  width: 52px;
  height: 52px;
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
    font-size: 10px;
    line-height: 1.6;
  }
}

.tools-wrapper {
  // 162px is the max width of def buttons, use 162px as base width
  // to keep tools-wrapper's width stable when switch among different def categories
  flex: 1 0 162px;
  position: relative;
  padding: 12px;
  background-color: var(--ui-color-grey-300);
  overflow-y: auto;

  .title {
    font-size: var(--ui-font-size-text);
    color: var(--ui-color-title);
  }

  .def-group {
    margin: 12px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;

    + .def-group {
      padding-top: 12px;
      border-top: 1px dashed var(--ui-color-border);
    }
  }

  .group-title {
    color: var(--ui-color-grey-700);
    font-size: 12px;
    line-height: 1.5;
  }

  .defs {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
}

.code-text-editor-wrapper {
  flex: 5 1 300px;
  min-width: 0;
  padding: 12px;
}

.extra {
  padding: 12px;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.thumbnail {
  flex: 0 0 auto;
  width: 60px;
  height: 60px;
  opacity: 0.3;
}

.zoomer {
  width: 60px;
  padding-bottom: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ui-gap-middle);
}

.zoom-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  border-radius: 12px;
  color: var(--ui-color-text);
  background-color: var(--ui-color-grey-300);
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--ui-color-grey-200);
  }
  &:active {
    background-color: var(--ui-color-grey-400);
  }
}
</style>
