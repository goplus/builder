<!-- Asset Item in asset-library -->

<template>
  <li class="asset-item" :class="{ active: props.selected }">
    <slot></slot>
    <UICornerIcon v-show="selected" type="check" />
  </li>
</template>

<script setup lang="ts">
import { UICornerIcon } from '@/components/ui'

const props = defineProps<{
  selected: boolean
}>()
</script>

<style lang="scss" scoped>
.asset-item {
  width: 140px;
  height: 140px;
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
    border-color: var(--ui-color-primary-main);
    background-color: var(--ui-color-primary-200);
  }
}
</style>
