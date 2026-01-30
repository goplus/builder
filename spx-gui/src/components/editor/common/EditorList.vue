<template>
  <div class="editor-list" :style="cssVars">
    <div class="sider">
      <div ref="itemsWrapper" v-radar="listRadarInfo" class="items">
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
          <button v-radar="addButtonRadarInfo" class="add">
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
import { humanizeResourceType, type ResourceModelType } from '@/models/common/resource-model'
import { UIIcon, type Color, useUIVariables, getCssVars, UIDropdownWithTooltip } from '@/components/ui'

const props = withDefaults(
  defineProps<{
    color: Color
    resourceType: ResourceModelType
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

<style scoped lang="scss">
.editor-list {
  flex: 1 1 0;
  display: flex;
  justify-content: stretch;
}

.sider {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--ui-color-dividing-line-2);
}

.items {
  flex: 1 1 0;
  overflow-y: auto;
  margin: 0 6px;
  // Here we keep the horizontal padding no more than `10px`,
  // as SortableJS uses `10` as `spacer` when deciding whether to put dragging item to the end of the list.
  // Padding no more than `10px` disables the `_ghostIsLast` check.
  // See details in https://github.com/SortableJS/Sortable/blob/ddd059717333d07b5b1125b7e1dc89514734bcf0/src/Sortable.js#L1822
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  :deep(.sortable-ghost-item) {
    // Shadow-like effect
    // TODO: Use other tools like svg-filter to achieve shadow-like effect, to avoid coupling here with `UIBlockItem`
    border-color: var(--ui-color-grey-400) !important;
    background-color: var(--ui-color-grey-400) !important;
    * {
      visibility: hidden;
    }
  }
}

.add {
  flex: 0 0 auto;
  justify-self: stretch;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-bottom-left-radius: var(--ui-border-radius-3);
  cursor: pointer;
  color: var(--ui-color-grey-100);
  background: var(--editor-list-color-main);

  // ensure the button's outline not covered by detail content on the right side
  position: relative;
  z-index: 1;

  &:hover {
    background: var(--editor-list-color-400);
  }
  &:active {
    background: var(--editor-list-color-600);
  }
}
</style>
