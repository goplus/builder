<template>
  <li class="editor-item" :class="{ active: selected }" :style="cssVars">
    <slot></slot>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getCssVars, useUIVariables, type Color } from '@/components/ui'

const props = defineProps<{
  selected: boolean
  color: Color
}>()

const uiVariables = useUIVariables()
const cssVars = computed(() => getCssVars('--editor-item-color-', uiVariables.color[props.color]))
</script>

<style lang="scss" scoped>
.editor-item {
  width: 88px;
  display: flex;
  flex-direction: column;
  position: relative;
  align-items: center;
  border-radius: var(--ui-border-radius-2);
  border: 2px solid var(--ui-color-grey-300);
  background-color: var(--ui-color-grey-300);
  cursor: pointer;

  &:not(.active):hover {
    border-color: var(--ui-color-grey-400);
    background-color: var(--ui-color-grey-400);
  }

  &.active {
    border-color: var(--editor-item-color-main);
    background-color: var(--editor-item-color-200);
  }
}

.name {
  font-size: 10px;
  line-height: 1.6;
  padding: 3px 8px 3px;

  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-align: center;
  text-overflow: ellipsis;
  color: var(--ui-color-title);
}
</style>
