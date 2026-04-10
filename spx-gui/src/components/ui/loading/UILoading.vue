<template>
  <div :class="rootClass">
    <NSpin />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NSpin } from 'naive-ui'
import { cn, type ClassValue } from '../utils'

export type MaskType = 'none' | 'semi-transparent' | 'solid'

const props = withDefaults(
  defineProps<{
    cover?: boolean
    visible?: boolean
    mask?: boolean | MaskType
    class?: ClassValue
  }>(),
  {
    cover: false,
    visible: true,
    mask: true,
    class: undefined
  }
)

const mask = computed(() => {
  if (props.mask === false) return 'none'
  if (props.mask === true) return 'semi-transparent'
  return props.mask
})

const rootClass = computed(() =>
  cn(
    'h-4/5 w-full flex justify-center invisible opacity-0 [transition:visibility_0.3s,opacity_0.3s]',
    props.cover ? 'absolute left-0 top-0 h-full' : null,
    props.cover && mask.value === 'semi-transparent' ? 'bg-white/50' : null,
    props.cover && mask.value === 'solid' ? 'bg-grey-100' : null,
    props.visible ? 'visible opacity-100' : null,
    props.class ?? null
  )
)
</script>
