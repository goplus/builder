<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div :class="rootClass" :data-icon-type="type" v-html="typeIconMap[type]"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { cn, type ClassValue } from '../utils'
import eyeOff from './eye-off.svg?raw'

const typeIconMap = {
  eyeOff
}

export type Type = keyof typeof typeIconMap

const props = defineProps<{
  type: Type
  class?: ClassValue
}>()

const rootClass = computed(() => cn('ui-icon flex h-4 w-4', props.class))
</script>

<style scoped>
.ui-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
