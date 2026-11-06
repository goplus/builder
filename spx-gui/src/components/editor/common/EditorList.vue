<template>
  <div class="flex-[1_1_0] flex">
    <div class="flex-none flex flex-col border-r border-dividing-line-2">
      <div
        ref="itemsWrapper"
        v-radar="listRadarInfo"
        class="items mx-0.5 flex-[1_1_0] flex flex-col gap-2 overflow-y-auto"
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
  /* Keep horizontal padding within the SortableJS drag-end threshold. */
  /* The extra 2px visual spacing comes from the wrapper margin above. */
  padding: 12px 10px;
}

.items:deep(.sortable-ghost-item) {
  opacity: 0.6;
  filter: grayscale(1);
  box-shadow: var(--ui-box-shadow-sm);
}

.items:deep(.sortable-ghost-item *) {
  visibility: hidden;
}
</style>
