<template>
  <li v-bind="rootAttrs" :class="rootClass" :style="rootStyle" @click="handleClick">
    <slot></slot>
  </li>
</template>

<script setup lang="ts">
import { computed, useAttrs, type StyleValue } from 'vue'
import { cn, type ClassValue } from '../utils'
import { getCssVars } from '../tokens/utils'
import { useUIVariables } from '../UIConfigProvider.vue'
import { useTabsCtx } from './UITabs.vue'

defineOptions({
  inheritAttrs: false
})

const props = defineProps<{
  value: string
}>()

const tabsCtx = useTabsCtx()
const attrs = useAttrs()
const active = computed(() => tabsCtx.value === props.value)
const uiVariables = useUIVariables()
const cssVars = computed(() =>
  getCssVars('--ui-tab-color-', {
    main: uiVariables.color[tabsCtx.color].main
  })
)
const rootClass = computed(() =>
  cn(
    'cursor-pointer flex items-center bg-(--ui-tab-color-main) px-middle py-[9px] text-16 text-grey-100 transition-opacity duration-200 first:rounded-tl-lg last:rounded-tr-lg',
    active.value ? 'opacity-100' : 'opacity-70',
    attrs.class as ClassValue
  )
)
const rootAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})
const rootStyle = computed<StyleValue>(() => [attrs.style as StyleValue, cssVars.value])

function handleClick() {
  tabsCtx.setValue(props.value)
}
</script>
