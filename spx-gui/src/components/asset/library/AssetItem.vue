<!-- Asset Item in asset-library -->

<template>
  <li class="asset-item" :class="{ selected, colorfulBackground }" :style="style">
    <div class="img-container">
      <slot></slot>
    </div>
    <UICornerIcon v-show="selected" type="check" />
  </li>
</template>

<script setup lang="ts">
import { UICornerIcon, type Color } from '@/components/ui'
import { computed } from 'vue'

const props = defineProps<{
  selected?: boolean
  color: Color
  colorfulBackground?: boolean
}>()

const style = computed(() => ({
  '--color-outline': `--ui-color-${props.color}-main`,
  '--color-background': `--ui-color-${props.color}-200`,
  '--color-background-faint': `--ui-color-${props.color}-100`
}))
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

  &:not(.selected):hover {
    border-color: var(--ui-color-grey-400);
    background-color: var(--ui-color-grey-400);
  }

  &.selected {
    border-color: var(--color-outline);
    background-color: var(--color-background);
  }

  &.colorfulBackground:not(.selected):not(:hover) {
    border-color: var(--color-background-faint);
    background-color: var(--color-background-faint);
  }
}
</style>
