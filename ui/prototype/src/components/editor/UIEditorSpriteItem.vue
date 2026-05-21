<script setup lang="ts">
import type { CSSProperties } from 'vue'
import eyeOffIcon from '@/assets/editor/ui-icons/eye-off.svg?raw'
import UIBlockItem from '@/components/editor/UIBlockItem.vue'

defineProps<{
  name: string
  selected?: boolean
  visible?: boolean
}>()

const imgStyle: CSSProperties = {
  width: '60px',
  height: '60px',
  marginBottom: '5px',
  objectFit: 'contain'
}
</script>

<template>
  <UIBlockItem :active="selected">
    <slot name="img" :style="imgStyle"></slot>

    <div class="prototype-editor-sprite-item-title" :title="name">
      <span class="prototype-editor-sprite-item-name">
        {{ name }}
      </span>
      <span
        v-if="visible === false"
        class="prototype-editor-sprite-item-hidden"
        aria-hidden="true"
        v-html="eyeOffIcon"
      ></span>
    </div>
    <slot></slot>
  </UIBlockItem>
</template>

<style scoped>
.prototype-editor-sprite-item-title {
  display: flex;
  width: 76px;
  height: 22px;
  align-items: center;
  gap: 2px;
  color: var(--ui-color-grey-1000);
  font-size: 11px;
  line-height: 22px;
  text-align: center;
}

.prototype-editor-sprite-item-name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prototype-editor-sprite-item-hidden {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  color: var(--ui-color-grey-700);
}

.prototype-editor-sprite-item-hidden :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
