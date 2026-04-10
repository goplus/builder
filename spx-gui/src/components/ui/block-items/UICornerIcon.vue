<!-- icon at the top-right corner of block-item -->

<template>
  <div :class="rootClass" :style="rootStyle" @click.stop="emit('click', $event)">
    <UIIcon class="h-4 w-4" :type="type" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { cn, type ClassValue } from '../utils'
import UIIcon, { type Type as IconType } from '../icons/UIIcon.vue'
import type { Color } from '../tokens/colors'
import { useUIVariables } from '../UIConfigProvider.vue'
import { getCssVars } from '../tokens/utils'

const props = withDefaults(
  defineProps<{
    type: IconType
    color?: Color
    class?: ClassValue
  }>(),
  {
    color: 'primary',
    class: undefined
  }
)

const emit = defineEmits<{
  click: [MouseEvent]
}>()

const uiVariables = useUIVariables()
const cssVars = computed(() => getCssVars('--ui-corner-icon-color-', uiVariables.color[props.color]))
const rootClass = computed(() =>
  cn(
    'absolute -top-1.5 -right-1.5 h-6 w-6 flex items-center justify-center rounded-full cursor-pointer',
    'text-grey-100 bg-(--ui-corner-icon-color-main) hover:bg-(--ui-corner-icon-color-400) active:bg-(--ui-corner-icon-color-600)',
    props.class ?? null
  )
)
const rootStyle = computed(() => cssVars.value)
</script>
