<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import ToolItem from './ToolItem.vue'
import IconCollapse from './icons/collapse.svg?raw'
import IconOverview from './icons/overview.svg?raw'
import { UITooltip } from '@/components/ui'
import MarkdownPreview from '@/components/editor/code-editor/ui/MarkdownPreview.vue'
import { icon2SVG, normalizeIconSize } from '@/components/editor/code-editor/ui/common'
import type {
  EditorUI,
  InputItem,
  InputItemCategory
} from '@/components/editor/code-editor/EditorUI'
import { debounce, useLocalStorage } from '@/utils/utils'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { onBeforeUpdate } from 'vue'

const props = defineProps<{
  ui: EditorUI
}>()

defineEmits<{
  insertText: [insertText: string]
}>()

const collapsed = useLocalStorage('spx-gui-sidebar-collapse', false)
const editorCtx = useEditorCtx()
const categories = ref<InputItemCategory[]>([])
const abortController = ref<AbortController | null>(null)

watch(
  () => editorCtx.project.selected?.type,
  () => {
    if (abortController.value) abortController.value.abort()

    const currentAbortController = new AbortController()
    abortController.value = currentAbortController

    props.ui
      .requestInputAssistantProviderResolve({
        signal: currentAbortController.signal
      })
      .then((result) => {
        if (currentAbortController.signal.aborted) return
        categories.value = result
      })
  },
  { immediate: true }
)

onUnmounted(() => {
  if (abortController.value) abortController.value.abort()
})

const activeCategoryIndex = shallowRef(0)
const isInCategoryClickScrollingState = ref(false)

const cancelCategoryClickScrollingState = debounce(() => {
  isInCategoryClickScrollingState.value = false
}, 100)

function handleCategoryClick(index: number) {
  props.ui.documentDetailState.visible = false
  activeCategoryIndex.value = index

  nextTick(() => {
    if (categoryTitleElements.value[index] && sidebarContainerElement.value) {
      const el = categoryTitleElements.value[index]
      const top = el.offsetTop
      sidebarContainerElement.value.scrollTo({
        top: top,
        behavior: 'smooth'
      })
      isInCategoryClickScrollingState.value = true
    }
  })
}

const categoryTitleElements = ref<HTMLElement[]>([])
const sidebarContainerElement = ref<HTMLElement | null>(null)

function setCategoryTitleRef(el: HTMLElement | null, index: number) {
  if (el) categoryTitleElements.value[index] = el
}

onBeforeUpdate(() => {
  categoryTitleElements.value = []
})

function handleScroll() {
  if (props.ui.documentDetailState.visible) return
  if (!(sidebarContainerElement.value && categoryTitleElements.value.length)) return
  cancelCategoryClickScrollingState()
  const scrollTop = sidebarContainerElement.value.scrollTop
  const containerHeight = sidebarContainerElement.value.clientHeight
  let activeIndex = 0
  for (let i = 0; i < categoryTitleElements.value.length; i++) {
    const el: HTMLElement | null = categoryTitleElements.value[i]
    if (!el) continue
    const offsetTop = el.offsetTop
    if (scrollTop >= offsetTop - containerHeight / 2) {
      activeIndex = i
    } else {
      break
    }
  }
  if (isInCategoryClickScrollingState.value) return
  activeCategoryIndex.value = activeIndex
}

onMounted(() => {
  sidebarContainerElement.value?.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  sidebarContainerElement.value?.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <!--  this ul element area is sidebar tab nav  -->
  <ul
    class="categories-wrapper skeleton-wrapper"
    :class="{
      'divide-line': collapsed
    }"
  >
    <template v-if="categories.length">
      <li
        v-for="(category, i) in categories"
        v-show="category.groups.length > 0"
        :key="i"
        class="category"
        :class="{ active: i === activeCategoryIndex }"
        :style="{ '--category-color': category.color }"
        @click="handleCategoryClick(i)"
      >
        <!-- eslint-disable vue/no-v-html -->
        <div class="icon" v-html="icon2SVG(category.icon)"></div>
        <p class="label">{{ $t(category.label) }}</p>
      </li>
    </template>
    <template v-else>
      <li v-for="i in 7" :key="i" class="category skeleton-category"></li>
    </template>
    <li class="categories-tools">
      <UITooltip>
        {{ collapsed ? $t({ zh: '展开', en: 'Collapse' }) : $t({ zh: '折叠', en: 'Expand' }) }}
        <template #trigger>
          <span
            class="collapse-button"
            :class="{
              collapsed: collapsed
            }"
            @click="collapsed = !collapsed"
          >
            <span class="icon" v-html="IconCollapse"></span>
          </span>
        </template>
      </UITooltip>
    </li>
  </ul>
  <!--  this area this used for sidebar main content display like: code shortcut input, document detail view, etc.  -->
  <div
    ref="sidebarContainerElement"
    :style="{
      width: collapsed ? '0' : undefined
    }"
    class="sidebar-container"
  >
    <section v-show="!ui.documentDetailState.visible" class="tools-wrapper">
      <template v-if="categories.length">
        <template v-for="(category, i) in categories" :key="i">
          <h4 :ref="(el) => setCategoryTitleRef(el as HTMLElement | null, i)" class="title">
            {{ $t(category.label) }}
          </h4>
          <div v-for="(group, j) in category.groups" :key="j" class="def-group">
            <h5 class="group-title">{{ $t(group.label) }}</h5>
            <div class="defs">
              <ToolItem
                v-for="(def, n) in group.inputItems"
                :key="n"
                :input-item="def as InputItem"
                @use-snippet="$emit('insertText', $event)"
              />
            </div>
          </div>
        </template>
      </template>
      <template v-else>
        <div class="skeleton-wrapper">
          <h4 class="skeleton-title"></h4>
          <div v-for="i in 7" :key="i" class="skeleton-group">
            <h5 class="skeleton-group-title"></h5>
            <div class="skeleton-items">
              <div
                v-for="j in Math.floor(Math.random() * 5) + 3"
                :key="j"
                class="skeleton-item"
              ></div>
            </div>
          </div>
        </div>
      </template>
    </section>
    <section v-show="ui.documentDetailState.visible" class="document-wrapper">
      <header class="header">
        <span
          :ref="(el) => normalizeIconSize(el as Element, 28)"
          class="icon"
          v-html="IconOverview"
        ></span>
        <span class="title"> OVERVIEW </span>
      </header>
      <MarkdownPreview
        class="detail"
        theme="detail"
        :content="ui.documentDetailState.document"
      ></MarkdownPreview>
    </section>
  </div>
</template>
<style lang="scss" scoped>
.categories-wrapper {
  flex: 0 0 60px;
  padding: 12px 4px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-right: 1px solid transparent;

  &.divide-line {
    border-right-color: var(--ui-color-grey-300);
  }
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
    cursor: pointer;
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

.categories-tools {
  margin-top: auto;
}

.collapse-button {
  display: inline-flex;
  justify-content: center;
  width: 100%;
  cursor: pointer;
  transition: 0.3s;
  transform: rotate(180deg);

  &.collapsed {
    transform: rotate(0);
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 4px;
    background-color: #ededed;
    border-radius: 999px;
  }
}

.sidebar-container {
  overflow-y: auto;
  flex-shrink: 0;
  width: 240px;
  background-color: white;
  transition: 0.3s;
}

@media (min-width: 1280px) {
  .sidebar-container {
    width: 240px;
  }
}

@media (min-width: 1440px) {
  .sidebar-container {
    width: 310px;
  }
}

@media (min-width: 1600px) {
  .sidebar-container {
    width: 360px;
  }
}

.tools-wrapper {
  padding: 0 12px 12px;

  .title {
    padding-top: 12px;
    font-size: var(--ui-font-size-text);
    color: var(--ui-color-title);
    white-space: nowrap;
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
    white-space: nowrap;
  }

  .defs {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
}

.skeleton-wrapper {
  .skeleton-category {
    background-color: #f0f0f0;
    animation: skeleton-loading 1.5s infinite;
  }

  .skeleton-title {
    height: 24px;
    width: 80%;
    margin: 12px 0 20px;
    background-color: #f0f0f0;
    animation: skeleton-loading 1.5s infinite;
  }

  .skeleton-group {
    margin-bottom: 20px;

    .skeleton-group-title {
      height: 24px;
      width: 60%;
      background-color: #f0f0f0;
      margin-bottom: 12px;
      animation: skeleton-loading 1.5s infinite;
    }

    .skeleton-items {
      gap: 12px;

      .skeleton-item {
        height: 32px;
        margin-bottom: 12px;
        background-color: #f0f0f0;
        border-radius: 4px;
        animation: skeleton-loading 1.5s infinite;
      }
    }
  }
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-category,
.skeleton-title,
.skeleton-group-title,
.skeleton-item {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
}

.document-wrapper {
  .header {
    display: flex;
    align-items: center;
    padding: 8px;
    color: #0bc0cf;

    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-right: 10px;
    }

    .title {
      width: 100%;
      font-size: 20px;
      border-bottom: 1px solid #0bc0cf;
    }
  }

  .detail {
    font-size: 14px;
    font-family:
      'JetBrains Mono NL',
      AlibabaHealthB,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      'Helvetica Neue',
      Arial,
      'Noto Sans',
      sans-serif,
      'Apple Color Emoji',
      'Segoe UI Emoji',
      'Segoe UI Symbol',
      'Noto Color Emoji';
  }
}
</style>
