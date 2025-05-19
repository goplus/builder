<!-- List for Sprite/Sound Panel -->

<template>
  <div ref="listWrapper" class="panel-list">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDragSortable } from '@/utils/drag-and-drop'

const props = withDefaults(
  defineProps<{
    sortable?: { list: unknown[] } | false
  }>(),
  {
    sortable: false
  }
)

const emit = defineEmits<{
  sorted: [oldIdx: number, newIdx: number]
}>()

const listWrapper = ref<HTMLElement | null>(null)
const sortableList = computed(() => (props.sortable ? props.sortable.list : null))

useDragSortable(sortableList, listWrapper, {
  ghostClass: 'sortable-ghost-item',
  onSorted(oldIdx, newIdx) {
    emit('sorted', oldIdx, newIdx)
  }
})
</script>

<style scoped lang="scss">
.panel-list {
  flex: 1 1 0;
  overflow-y: auto;
  margin: 0;
  padding: 12px 0 12px 12px; // no right padding to allow optional scrollbar
  scrollbar-width: thin;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
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
</style>
