<template>
  <UIBlockItem :active="selected" :interactive="!!selectable" :droppable="droppable">
    <slot name="img" :style="imgStyle"></slot>
    <div class="editor-sprite-item-title">
      <span class="editor-sprite-item-title__name" :title="name">
        {{ name }}
      </span>
      <UIIcon
        v-if="visible === false"
        class="editor-sprite-item-title__hidden-icon cursor-auto text-grey-700"
        type="eyeOff"
        title="Invisible"
      />
    </div>
    <slot></slot>
  </UIBlockItem>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

import UIBlockItem, { type DroppableState } from '@/components/ui/block-items/UIBlockItem.vue'
import UIIcon from '@/components/ui/icons/UIIcon.vue'

const props = withDefaults(
  defineProps<{
    name: string
    selectable?: false | { selected: boolean }
    droppable?: DroppableState | false
    visible?: boolean | null
  }>(),
  {
    selectable: false,
    droppable: false,
    visible: null
  }
)

const selected = computed(() => props.selectable && props.selectable.selected)

const imgStyle: CSSProperties = {
  marginBottom: '5px',
  height: '60px',
  width: '60px'
}
</script>

<style scoped>
@layer components {
  .editor-sprite-item-title {
    box-sizing: border-box;
    display: flex;
    width: 100%;
    height: 22px;
    align-items: center;
    gap: 2px;
    padding: 0 4px;
    color: var(--ui-color-title);
    font-size: var(--ui-font-size-2xs);
    line-height: 16px;
    text-align: center;
  }

  .editor-sprite-item-title__name {
    min-width: 0;
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .editor-sprite-item-title__hidden-icon {
    width: 14px;
    height: 14px;
    flex: 0 0 14px;
  }
}
</style>
