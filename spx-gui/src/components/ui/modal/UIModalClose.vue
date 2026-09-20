<template>
  <button
    v-radar="{ name: 'Close button', desc: 'Click to close the modal' }"
    type="button"
    :aria-label="props.ariaLabel"
    :class="rootClass"
  >
    <UIIcon type="close" :class="size === 'large' ? 'h-6 w-6' : 'h-5 w-5'" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { cn, type ClassValue } from '../utils'
import UIIcon from '../icons/UIIcon.vue'

const props = withDefaults(
  defineProps<{
    size?: 'medium' | 'large'
    class?: ClassValue
    ariaLabel?: string
  }>(),
  {
    size: 'medium',
    class: undefined,
    ariaLabel: 'Close'
  }
)

const rootClass = computed(() =>
  cn(
    'relative flex cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-grey-800 transition-colors duration-200 hover:bg-grey-400 active:bg-grey-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-main',
    'h-10 w-10',
    props.class
  )
)
</script>
