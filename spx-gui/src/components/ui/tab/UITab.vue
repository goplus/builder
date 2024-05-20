<template>
  <li class="ui-tab" :class="{ active }" :style="cssVars" @click="handleClick">
    <slot></slot>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getCssVars } from '../tokens/utils'
import { useUIVariables } from '../UIConfigProvider.vue'
import { useTabsCtx } from './UITabs.vue'

const props = defineProps<{
  value: string
}>()

const tabsCtx = useTabsCtx()
const active = computed(() => tabsCtx.value.value === props.value)
const uiVariables = useUIVariables()
const cssVars = computed(() =>
  getCssVars('--ui-tab-color-', {
    main: uiVariables.color[tabsCtx.color.value].main
  })
)

function handleClick() {
  tabsCtx.setValue(props.value)
}
</script>

<style lang="scss" scoped>
.ui-tab {
  padding: 9px var(--ui-gap-middle);
  display: flex;
  align-items: center;
  font-size: 16px;
  color: var(--ui-color-grey-100);
  opacity: 0.7;
  background-color: var(--ui-tab-color-main);
  cursor: pointer;
  transition: opacity 0.2s;

  &.active {
    opacity: 1;
  }

  &:first-child {
    border-top-left-radius: var(--ui-border-radius-3);
  }
  &:last-child {
    border-top-right-radius: var(--ui-border-radius-3);
  }
}
</style>
