<script setup lang="ts">
import type { HoverPreview } from './hover-preview'
import DocumentPreview from './DocumentPreview.vue'
import { editor as IEditor } from 'monaco-editor'
import RenameComponent from '@/components/editor/code-editor/ui/features/hover-preview/RenameComponent.vue'
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'
import { type Action, DocPreviewLevel, type RenamePreview } from '../../../EditorUI'

const props = defineProps<{
  hoverPreview: HoverPreview
}>()
const hoverPreviewState = props.hoverPreview.hoverPreviewState

props.hoverPreview.onMousemove((e) => {
  if (hoverPreviewState.focused) return

  if (e.type !== IEditor.MouseTargetType.CONTENT_TEXT) return props.hoverPreview.hideDocument(true)

  const mouseColumn = e.position.column
  const mouseLineNumber = e.position.lineNumber

  const position = props.hoverPreview.editor.getModel()?.getWordAtPosition({
    column: e.range.startColumn,
    lineNumber: e.range.startLineNumber
  })
  if (!position || !position.word) return props.hoverPreview.hideDocument(true)

  const { startColumn, endColumn } = position
  const lineNumber = e.position.lineNumber
  // check if the word or mouse position is outside the allowed range
  if (
    // word is outside the range on the start or end line
    (lineNumber === hoverPreviewState.range.startLineNumber &&
      endColumn <= hoverPreviewState.range.startColumn) ||
    (lineNumber === hoverPreviewState.range.endLineNumber &&
      startColumn >= hoverPreviewState.range.endColumn) ||
    // word or mouse is on a line outside the allowed range
    lineNumber < hoverPreviewState.range.startLineNumber ||
    lineNumber > hoverPreviewState.range.endLineNumber ||
    mouseLineNumber < hoverPreviewState.range.startLineNumber ||
    mouseLineNumber > hoverPreviewState.range.endLineNumber ||
    // mouse is outside the column range on the start or end line
    (mouseLineNumber === hoverPreviewState.range.startLineNumber &&
      mouseColumn < hoverPreviewState.range.startColumn) ||
    (mouseLineNumber === hoverPreviewState.range.endLineNumber &&
      mouseColumn > hoverPreviewState.range.endColumn)
  ) {
    return props.hoverPreview.hideDocument(true)
  }
})

props.hoverPreview.onShowDocument((range) => {
  const containerRect = props.hoverPreview.editor.getContainerDomNode().getBoundingClientRect()
  const scrolledVisiblePosition = props.hoverPreview.editor.getScrolledVisiblePosition({
    lineNumber: range.endLineNumber,
    column: range.startColumn
  })
  if (!scrolledVisiblePosition) return
  props.hoverPreview.tryToPreventHideDocument()
  hoverPreviewState.visible = true
  hoverPreviewState.range = { ...range }
  hoverPreviewState.position.top =
    // here add `scrolledVisiblePosition.height` to make docPreview show under current code line
    containerRect.top + scrolledVisiblePosition.top + scrolledVisiblePosition.height
  hoverPreviewState.position.left = containerRect.left + scrolledVisiblePosition.left
})

const cleanUp = () => {
  layer.value = null
  errorMessage.value = ''
  hoverPreviewState.focused = false
  abortController.abort()
}

watch(
  () => hoverPreviewState.visible,
  (visible) => {
    if (!visible) cleanUp()
  }
)

onUnmounted(() => {
  cleanUp()
})

function handleActionClick(action: Action) {
  const result = action.onClick()
  if (result?.type === 'rename') {
    // toggle rename layer
    layer.value = layer.value ? null : result.layer
  }
}

const layer = shallowRef<RenamePreview | null>(null)
const errorMessage = ref('')
let abortController = new AbortController()

function handleSubmit(value: string) {
  if (!layer.value) return
  abortController.abort()
  abortController = new AbortController()

  layer.value
    .onSubmit(value, { signal: abortController.signal }, (error) => {
      errorMessage.value = error
    })
    .then(() => {
      layer.value = null
      abortController.abort()
    })
}

function handleMouseLeave() {
  if (hoverPreviewState.focused) return
  props.hoverPreview.tryToPreventHideDocument()
}

// equal `window.addEventListener('keyup', handleEscape)`
addEventListener('keyup', handleEscape)
onUnmounted(() => {
  removeEventListener('keyup', handleEscape)
})

function handleEscape(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (hoverPreviewState.focused) {
    hoverPreviewState.focused = false
  } else {
    props.hoverPreview.hideDocument(true)
  }
}

const hoverPreviewContainerElement = ref<HTMLElement>()
const activeIdx = ref(0)

const firstDocumentIndex = computed(() =>
  hoverPreviewState.docs.findIndex((doc) => doc.level === DocPreviewLevel.Normal)
)

watch(activeIdx, () => {
  updateDocumentCardPosition()
})

function updateDocumentCardPosition() {
  const containerElement = hoverPreviewContainerElement.value
  if (!containerElement || hoverPreviewState.docs.length <= 0) return
  const documentElements = Array.from(containerElement.children).filter(
    (documentContainer) =>
      documentContainer.classList.contains('hover-document') &&
      Number(documentContainer.getAttribute('data-level')) === DocPreviewLevel.Normal
  ) as HTMLElement[]
  if (documentElements.length < 2) return
  const headerElements: Element[] = documentElements
    .map((documentContainer) => documentContainer.firstElementChild)
    .filter(
      // add `headerElement is Element` to pass ts check
      (headerElement): headerElement is Element =>
        // add `headerElement != null` to pass ts check
        headerElement != null && headerElement.classList.contains('declaration-wrapper')
    )
  if (documentElements.length !== headerElements.length)
    return console.warn('not all documents contains header')
  const documentRects = documentElements.map((element) => {
    const rect = element.getBoundingClientRect()
    return {
      // this top and left is related to its parent node, not viewport
      top: element.offsetTop,
      left: element.offsetLeft,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    }
  })
  const headerRects = headerElements.map((element) => element.getBoundingClientRect())

  let totalHeaderHeight = documentRects[0].top || 0
  let beforeActiveElementBaseOffset = 0
  const documentGap = 4 // from css
  const currentIdx = activeIdx.value - firstDocumentIndex.value
  documentElements.forEach((element, i) => {
    let offset = -documentRects[i].top + totalHeaderHeight
    totalHeaderHeight += headerRects[i].height + documentGap

    if (i === currentIdx) {
      beforeActiveElementBaseOffset =
        totalHeaderHeight + documentRects[i].height - headerRects[i].height
      // rest previous all header height
      totalHeaderHeight = 0
    }

    if (i > currentIdx) offset += beforeActiveElementBaseOffset

    element.style.transform = `translateY(${offset}px)`
  })
}
</script>
<template>
  <slot></slot>
  <teleport to="body">
    <div class="hover-preview-wrapper">
      <transition @after-enter="updateDocumentCardPosition">
        <article
          v-show="hoverPreviewState.visible"
          ref="hoverPreviewContainerElement"
          class="hover-preview-container"
          :style="{
            top: hoverPreviewState.position.top + 'px',
            left: hoverPreviewState.position.left + 'px'
          }"
          @mouseleave="handleMouseLeave"
          @mouseenter="hoverPreview.tryToPreventHideDocument()"
        >
          <DocumentPreview
            v-for="(doc, i) in hoverPreviewState.docs"
            :key="i"
            :data-level="doc.level"
            class="hover-document"
            :header="doc.header"
            :content="doc.content"
            :more-actions="doc.moreActions"
            :recommend-action="doc.recommendAction"
            @action-click="handleActionClick"
            @mouseenter="activeIdx = i"
          ></DocumentPreview>
          <div class="extra-layer-wrapper">
            <transition name="slide">
              <RenameComponent
                v-if="layer"
                :placeholder="layer.placeholder"
                :error-message="errorMessage"
                class="extra-layer rename-component"
                @submit="handleSubmit"
                @on-focus="hoverPreviewState.focused = true"
                @on-blur="hoverPreviewState.focused = false"
              ></RenameComponent>
            </transition>
          </div>
        </article>
      </transition>
    </div>
  </teleport>
</template>

<style lang="scss" scoped>
.hover-preview-wrapper {
  z-index: 999;
  position: fixed;
  inset: 0;
  width: 0;
  height: 0;
}

.hover-preview-container {
  position: absolute;
  transform-origin: top left;

  &.v-enter-active,
  &.v-leave-active {
    transition: 0.15s cubic-bezier(0, 1.25, 1, 1);
  }

  &.v-enter-from,
  &.v-leave-to {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
}

.extra-layer {
  &.slide-enter-active {
    transition: 0.3s cubic-bezier(0, 1.25, 1, 1);
  }
  &.slide-leave-active {
    transition: 0.3s cubic-bezier(0, 1.25, 1, 1);
  }

  &.slide-enter-from {
    opacity: 0;
    transform: translateY(20px);
  }

  &.slide-leave-to {
    opacity: 0;
    transform: translateY(-20px);
  }
}

.hover-document + .hover-document {
  margin-top: 4px;
}

.extra-layer-wrapper {
  position: absolute;
  right: 0;
  top: 0;
  padding-left: 4px;
  transform: translateX(100%);
}
</style>
