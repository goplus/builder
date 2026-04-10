<template>
  <div v-radar="{ name: 'Close button', desc: 'Click to close the modal' }" v-bind="rootAttrs" :class="rootClass">
    <UIIcon type="close" :class="iconClass" />
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { cn, type ClassValue } from '../utils'
import UIIcon from '../icons/UIIcon.vue'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    size?: 'medium' | 'large'
  }>(),
  {
    size: 'medium'
  }
)

const attrs = useAttrs()
const rootClass = computed(() =>
  cn(
    'flex items-center justify-center rounded-full text-grey-700 transition-colors duration-200 hover:bg-grey-400 active:bg-grey-500',
    props.size === 'large' ? 'h-8 w-8' : 'h-7 w-7',
    attrs.class as ClassValue
  )
)
const iconClass = computed(() => (props.size === 'large' ? 'h-6 w-6' : 'h-5 w-5'))
const rootAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
</script>
