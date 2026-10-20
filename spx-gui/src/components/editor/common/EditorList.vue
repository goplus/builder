<template>
  <div
    class="flex-[1_1_0] flex"
    :class="{
      'editor-list-compact':
        props.resourceType === 'sound' ||
        props.resourceType === 'backdrop' ||
        props.resourceType === 'costume' ||
        props.resourceType === 'animation' ||
        props.resourceType === 'widget'
    }"
  >
    <div
      class="editor-list-sidebar flex-none flex flex-col border-r border-dividing-line-2"
      :style="{ '--editor-list-scrollbar-width': `${scrollbarWidth}px` }"
    >
      <div
        ref="itemsWrapper"
        v-radar="listRadarInfo"
        class="items mx-1.5 flex-[1_1_0] flex flex-col gap-2 overflow-y-auto"
      >
        <slot></slot>
      </div>
      <UIDropdownWithTooltip>
        <template #dropdown-content>
          <slot name="add-options"></slot>
        </template>
        <template #tooltip-content>
          {{ $t(addText) }}
        </template>
        <template #trigger>
          <button
            v-radar="addButtonRadarInfo"
            type="button"
            class="h-11 w-full flex-none cursor-pointer appearance-none flex items-center justify-center rounded-none rounded-bl-md border-x-0 border-t border-b-0 border-grey-400 bg-grey-100 p-3 text-grey-800 outline-none transition-colors hover:bg-grey-300 active:bg-grey-400"
          >
            <UIIcon type="plus" />
          </button>
        </template>
      </UIDropdownWithTooltip>
    </div>
    <slot name="detail"></slot>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useContentSize } from '@/utils/dom'
import { useDragSortable } from '@/utils/drag-and-drop'
import type { RadarNodeMeta } from '@/utils/radar'
import { humanizeResourceType, type ResourceType } from '@/models/spx/common/resource'
import { UIIcon, UIDropdownWithTooltip } from '@/components/ui'

const props = withDefaults(
  defineProps<{
    resourceType: ResourceType
    sortable?: { list: unknown[] } | false
  }>(),
  {
    sortable: false
  }
)

const emit = defineEmits<{
  sorted: [oldIdx: number, newIdx: number]
}>()

const resourceTypeName = computed(() => humanizeResourceType(props.resourceType))

const listRadarInfo = computed<RadarNodeMeta>(() => {
  const draggable = props.sortable && props.sortable.list.length > 0
  return {
    name: `List of ${resourceTypeName.value.en}`,
    desc: draggable ? 'Drag to reorder' : ''
  }
})

const addText = computed(() => ({
  en: `Add ${resourceTypeName.value.en}`,
  zh: `添加${resourceTypeName.value.zh}`
}))

const addButtonRadarInfo = computed<RadarNodeMeta>(() => ({
  name: `Add ${resourceTypeName.value.en}`,
  desc: `Button for adding new ${resourceTypeName.value.en} to the list`
}))

const itemsWrapper = ref<HTMLElement | null>(null)
const itemsSize = useContentSize(itemsWrapper)
const scrollbarWidth = computed(() => {
  const el = itemsWrapper.value
  return el != null && itemsSize.value != null ? Math.max(0, el.offsetWidth - el.clientWidth) : 0
})
const sortableList = computed(() => (props.sortable ? props.sortable.list : null))

useDragSortable(sortableList, itemsWrapper, {
  ghostClass: 'sortable-ghost-item',
  onSorted(oldIdx, newIdx) {
    emit('sorted', oldIdx, newIdx)
  }
})
</script>

<style scoped>
.editor-list-compact {
  --editor-card-corner-inset: 2px;
  --editor-card-corner-icon-size: 14px;
  --editor-sprite-thumbnail-size: 40px;
  --editor-sprite-thumbnail-margin-top: 2px;
  --editor-sprite-thumbnail-margin-bottom: 4px;
}

.editor-list-compact .editor-list-sidebar {
  width: calc(92px + var(--editor-list-scrollbar-width, 0px));
}

.editor-list-compact .items {
  min-width: 0;
  margin-inline: 0;
  padding-inline: 9.5px;
  align-items: center;
  scrollbar-gutter: stable;
}

.editor-list-compact :deep(.items > .ui-block-item) {
  width: 72px;
  height: 72px;
}

.editor-list-compact :deep(.items > .ui-block-item .player-wrapper) {
  margin-top: 8px;
  margin-bottom: 0;
}

.editor-list-compact :deep(.items > .ui-block-item .play-control-play) {
  box-sizing: border-box;
  padding: 2px;
  background-clip: content-box;
}

.editor-list-compact :deep(.items > .ui-block-item .play-control-icon) {
  width: 14px;
  height: 14px;
}

.editor-list-compact :deep(.items > .ui-block-item .play-control-stop .progress) {
  inset: 2px;
  width: 32px;
  height: 32px;
}

.editor-list-compact :deep(.items > .ui-block-item .backdrop-thumbnail) {
  width: 64px;
  height: 44px;
}

.editor-list-compact :deep(.items > .ui-block-item .icon-container) {
  width: 36px;
  height: 36px;
  margin-top: 4px;
  margin-bottom: 6px;
}

.items {
  /* Here we keep the horizontal padding no more than `10px`, */
  /* as SortableJS uses `10` as `spacer` when deciding whether to put dragging item to the end of the list. */
  /* Padding no more than `10px` disables the `_ghostIsLast` check. */
  /* See details in https://github.com/SortableJS/Sortable/blob/ddd059717333d07b5b1125b7e1dc89514734bcf0/src/Sortable.js#L1822 */
  padding: 12px 10px;
  padding-bottom: calc(12px + var(--editor-console-safe-area, 0px));
}

.items:deep(.sortable-ghost-item) {
  /* Shadow-like effect */
  /* TODO: Use other tools like svg-filter to achieve shadow-like effect, to avoid coupling here with `UIBlockItem` */
  border-color: var(--ui-color-grey-400) !important;
  background-color: var(--ui-color-grey-400) !important;
}

.items:deep(.sortable-ghost-item *) {
  visibility: hidden;
}
</style>
