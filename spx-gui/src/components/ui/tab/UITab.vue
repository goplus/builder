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
const active = computed(() => tabsCtx.value === props.value)
const uiVariables = useUIVariables()
const cssVars = computed(() =>
  getCssVars('--ui-tab-color-', {
    main: uiVariables.color[tabsCtx.color].main
  })
)

function handleClick() {
  tabsCtx.setValue(props.value)
}
</script>

<style lang="scss" scoped>
.ui-tab {
  padding: 9px 0;
  display: flex;
  align-items: center;
  font-size: 16px;
  color: var(--ui-color-grey-800);
  cursor: pointer;
  transition: color 0.2s;

  &.active {
    color: var(--ui-color-grey-1000);
    border-bottom: 2px solid var(--ui-color-grey-1000);
  }
}
</style>
