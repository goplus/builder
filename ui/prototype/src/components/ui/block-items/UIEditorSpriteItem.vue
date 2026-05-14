<template>
  <UIBlockItem :active="selected" :interactive="!!selectable" class="editor-sprite-item">
    <slot name="img" :style="imgStyle" />
    <div class="editor-sprite-item__name-row" data-testid="sprite-name-row">
      <span class="editor-sprite-item__name" :title="name" data-testid="sprite-name-text">
        {{ name }}
      </span>
      <svg
        v-if="visible === false"
        class="editor-sprite-item__hidden-icon"
        data-testid="sprite-hidden-icon"
        viewBox="0 0 24 24"
        aria-label="Hidden sprite"
      >
        <path
          d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l3.04 3.04A13.74 13.74 0 0 0 2 12c1.98 4.24 5.45 6.5 10 6.5 1.5 0 2.86-.25 4.07-.73l4.65 4.65a.75.75 0 1 0 1.06-1.06L3.28 2.22Zm7.32 7.32 3.86 3.86A2.75 2.75 0 0 1 10.6 9.54ZM12 17c-3.6 0-6.34-1.65-8.24-5a12.24 12.24 0 0 1 2.58-4.6l2.37 2.37A4.25 4.25 0 0 0 14.23 15.3l.67.67c-.88.68-1.85 1.03-2.9 1.03Zm0-10c3.6 0 6.34 1.65 8.24 5a12.15 12.15 0 0 1-2.03 3.68l1.07 1.07A13.77 13.77 0 0 0 22 12c-1.98-4.24-5.45-6.5-10-6.5-1.15 0-2.23.15-3.23.45l1.21 1.21c.63-.11 1.3-.16 2.02-.16Zm-.44 1.52 1.57 1.57a2.77 2.77 0 0 1 .78.78l1.57 1.57A4.25 4.25 0 0 0 11.56 8.52Z"
          fill="currentColor"
        />
      </svg>
    </div>
  </UIBlockItem>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

import UIBlockItem from '@/components/ui/block-items/UIBlockItem.vue'

const props = withDefaults(
  defineProps<{
    name: string
    selectable?: false | { selected: boolean }
    visible?: boolean | null
  }>(),
  {
    selectable: false,
    visible: null
  }
)

const selected = computed(() => props.selectable && props.selectable.selected)

const imgStyle: CSSProperties = {
  height: '60px',
  width: '60px',
  marginBottom: '5px'
}
</script>

<style scoped>
@layer components {
  .editor-sprite-item__name-row {
    box-sizing: border-box;
    display: flex;
    width: 100%;
    height: 22px;
    align-items: center;
    gap: 2px;
    padding-right: 4px;
    padding-left: 4px;
    color: var(--ui-color-title);
    font-size: var(--ui-font-size-2xs);
    line-height: 16px;
    text-align: center;
  }

  .editor-sprite-item__name {
    min-width: 0;
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .editor-sprite-item__hidden-icon {
    width: 14px;
    height: 14px;
    flex: 0 0 14px;
    color: var(--ui-color-grey-700);
  }
}
</style>
