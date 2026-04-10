<!-- icon at the top-right corner of block-item -->

<template>
  <div v-bind="rootAttrs" :class="rootClass" :style="rootStyle" @click.stop="emit('click', $event)">
    <UIIcon class="h-4 w-4" :type="type" />
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs, type StyleValue } from 'vue'
import { cn, type ClassValue } from '../utils'
import UIIcon, { type Type as IconType } from '../icons/UIIcon.vue'
import type { Color } from '../tokens/colors'
import { useUIVariables } from '../UIConfigProvider.vue'
import { getCssVars } from '../tokens/utils'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    type: IconType
    color?: Color
  }>(),
  {
    color: 'primary'
  }
)

const emit = defineEmits<{
  click: [MouseEvent]
}>()

const attrs = useAttrs()
const uiVariables = useUIVariables()
const cssVars = computed(() => getCssVars('--ui-corner-icon-color-', uiVariables.color[props.color]))
const rootClass = computed(() =>
  cn(
    'absolute -top-1.5 -right-1.5 h-6 w-6 flex items-center justify-center rounded-full cursor-pointer',
    'text-grey-100 bg-(--ui-corner-icon-color-main) hover:bg-(--ui-corner-icon-color-400) active:bg-(--ui-corner-icon-color-600)',
    attrs.class as ClassValue | null
  )
)
const rootAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})
const rootStyle = computed<StyleValue>(() => [attrs.style as StyleValue, cssVars.value])
</script>
