<template>
  <div :class="rootClass" :style="backgroundStyle">
    <UILoading :visible="loading" cover :mask="false" />
  </div>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

import { cn, type ClassValue } from './utils'
import UILoading from './loading/UILoading.vue'

const props = withDefaults(
  defineProps<{
    src: string | null
    loading?: boolean
    size?: 'contain' | 'cover'
    class?: ClassValue
  }>(),
  {
    // TODO: loading for public URL fetching
    loading: false,
    size: 'contain',
    class: undefined
  }
)

const rootClass = computed(() =>
  cn(
    // Disable image smoothing to keep pixelated look, so it looks good for pixel art assets.
    // See details in https://github.com/goplus/builder/issues/2214.
    'relative flex items-center justify-center bg-center bg-no-repeat [image-rendering:pixelated]',
    props.class
  )
)

const backgroundStyle = computed<CSSProperties | null>(() => {
  if (props.src == null) return null
  return {
    backgroundImage: `url("${props.src}")`,
    backgroundSize: props.size
  }
})
</script>
