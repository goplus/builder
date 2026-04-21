<template>
  <div class="flex-[1_1_0] flex">
    <div class="flex-none flex flex-col border-r border-dividing-line-2">
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
const sortableList = computed(() => (props.sortable ? props.sortable.list : null))

useDragSortable(sortableList, itemsWrapper, {
  ghostClass: 'sortable-ghost-item',
  onSorted(oldIdx, newIdx) {
    emit('sorted', oldIdx, newIdx)
  }
})
</script>

<style scoped>
.items {
  /* Here we keep the horizontal padding no more than `10px`, */
  /* as SortableJS uses `10` as `spacer` when deciding whether to put dragging item to the end of the list. */
  /* Padding no more than `10px` disables the `_ghostIsLast` check. */
  /* See details in https://github.com/SortableJS/Sortable/blob/ddd059717333d07b5b1125b7e1dc89514734bcf0/src/Sortable.js#L1822 */
  padding: 12px 10px;
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
