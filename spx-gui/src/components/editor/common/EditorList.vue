<template>
  <div class="flex-[1_1_0] flex" :style="cssVars">
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
            class="relative z-1 h-11 flex-none cursor-pointer flex items-center justify-center rounded-bl-lg border-none bg-(--editor-list-color-main) text-grey-100 hover:bg-(--editor-list-color-400) active:bg-(--editor-list-color-600)"
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
import { UIIcon, type Color, useUIVariables, getCssVars, UIDropdownWithTooltip } from '@/components/ui'

const props = withDefaults(
  defineProps<{
    color: Color
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

const uiVariables = useUIVariables()
const cssVars = computed(() => getCssVars('--editor-list-color-', uiVariables.color[props.color]))

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
