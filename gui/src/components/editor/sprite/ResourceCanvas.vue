<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useContentSize } from '@/utils/dom'
import { useRenderableImage } from '@/utils/img-rendering'
import type { File } from '@/models/common/file'
import { useResourceWorkspace } from './resource-workspace'
import { getCanvasView, useResourceCanvas } from './resource-canvas'

const props = defineProps<{
  resourceKey: string
  image?: File | null
  mediaSize?: { width: number; height: number } | null
  previewOnly?: boolean
}>()
const workspace = useResourceWorkspace()
const previewTopSpace = computed(() => workspace?.previewTopSpace.value ?? 56)
const views = useResourceCanvas()
const viewport = ref<HTMLElement | null>(null)
const size = useContentSize(viewport)
const details = ref<HTMLElement | null>(null)
const detailsSize = useContentSize(details)
const [image] = useRenderableImage(() => props.image)
const view = computed(() => (views == null ? null : getCanvasView(views, props.resourceKey)))
const bottomSpace = computed(() => workspace?.previewBottomSpace.value ?? 244)
// Keep the media in a stable area above the AI panel, including when the panel is closed.
const availableSize = computed(() => ({
  width: Math.max(80, Math.min(640, (size.value?.width ?? 0) - 48)),
  height: Math.max(80, (size.value?.height ?? 0) - previewTopSpace.value - bottomSpace.value)
}))
const center = computed(() => ({
  x: (size.value?.width ?? 0) / 2,
  y: previewTopSpace.value + availableSize.value.height / 2
}))

function fit() {
  if (view.value == null || size.value == null) return
  const { width, height } = availableSize.value
  const ratio =
    props.mediaSize != null
      ? props.mediaSize.width / props.mediaSize.height
      : image.value == null
        ? 1
        : image.value.naturalWidth / image.value.naturalHeight
  Object.assign(view.value, {
    width: Math.min(width, height * ratio),
    height: Math.min(height, width / ratio)
  })
}

watch(
  [view, availableSize, image, () => props.mediaSize],
  () => {
    if (props.mediaSize != null || props.image == null || image.value != null) fit()
  },
  { immediate: true }
)

const area = computed(() => {
  const state = view.value
  if (state == null) return null
  return {
    left: center.value.x - state.width / 2,
    top: center.value.y - state.height / 2,
    width: state.width,
    height: state.height
  }
})
watch(
  viewport,
  (element) => {
    if (workspace == null || element == null) return
    // Keep replacement previews sized before their first ResizeObserver notification.
    if (size.value == null) size.value = { width: element.clientWidth, height: element.clientHeight }
  },
  { immediate: true }
)
const frameStyle = computed(() =>
  area.value == null
    ? null
    : {
        left: `${area.value.left}px`,
        top: `${area.value.top}px`,
        width: `${area.value.width}px`,
        height: `${area.value.height}px`
      }
)
watch([viewport, size, area, details], (_, __, onCleanup) => {
  if (workspace == null || viewport.value == null || size.value == null || area.value == null) return
  const previous = workspace.details.value
  const current = details.value
  workspace.details.value = current
  workspace.previewArea.value = area.value
  onCleanup(() => {
    if (workspace.details.value === current) workspace.details.value = previous?.isConnected ? previous : null
  })
})

const detailsStyle = computed(() => {
  if (area.value == null || size.value == null) return null
  const height = detailsSize.value?.height ?? 0
  const above = area.value.top - height - 12
  const top =
    above >= 120
      ? above
      : Math.min(area.value.top + area.value.height + 12, size.value.height - height - bottomSpace.value - 8)
  return { top: `${Math.max(56, top)}px`, width: `${Math.min(400, size.value.width - 32)}px` }
})
</script>

<template>
  <div v-if="views == null" class="relative flex-1 overflow-hidden rounded-sm w-full">
    <slot></slot>
    <slot name="media-overlay"></slot>
    <slot name="overlay"></slot>
    <slot name="controls"></slot>
    <slot name="media-controls"></slot>
  </div>
  <div
    v-else
    ref="viewport"
    v-radar="{ name: 'Resource preview', desc: 'Preview of the selected costume or animation' }"
    class="absolute inset-0 overflow-hidden bg-grey-200"
    @dragstart.prevent
    @pointerdown.self="workspace != null && !workspace.selectionLocked.value && (workspace.selected.value = false)"
  >
    <div v-if="view!.width > 0" class="absolute select-none" :style="frameStyle">
      <div class="relative h-full w-full">
        <slot></slot>
        <slot name="media-overlay"></slot>
      </div>
    </div>
    <div
      v-if="area != null && workspace != null && !previewOnly && $slots['media-controls'] != null"
      v-radar="{ name: 'Resource preview controls', desc: 'Playback and trimming controls for the current video' }"
      class="absolute z-20 flex flex-col gap-1"
      :style="{
        left: `${area.left}px`,
        top: `${area.top + area.height + 4}px`,
        width: `${area.width}px`
      }"
    >
      <slot name="media-controls"></slot>
    </div>
    <div
      v-else-if="area != null && $slots['media-controls'] != null"
      class="absolute z-20"
      :style="{
        left: `${area.left}px`,
        top: `${area.top + area.height + 4}px`,
        width: `${area.width}px`
      }"
    >
      <slot name="media-controls"></slot>
    </div>
    <div
      v-show="workspace?.selected.value !== false"
      ref="details"
      class="absolute z-20 left-1/2 -translate-x-1/2"
      :style="detailsStyle"
    ></div>
    <div
      v-if="$slots.overlay != null"
      v-show="workspace?.selected.value !== false"
      class="absolute inset-0 pointer-events-none"
    >
      <slot name="overlay" :area="area"></slot>
    </div>
    <div class="absolute inset-x-4 bottom-36">
      <slot name="controls"></slot>
    </div>
  </div>
</template>
