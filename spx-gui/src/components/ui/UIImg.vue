<template>
  <div
    :class="
      cn(
        // Disable image smoothing to keep pixelated look, so it looks good for pixel art assets.
        // See details in https://github.com/goplus/builder/issues/2214.
        'relative flex items-center justify-center overflow-hidden [image-rendering:pixelated]',
        props.class
      )
    "
  >
    <img
      v-if="src != null"
      crossorigin="anonymous"
      :src="src"
      alt=""
      class="absolute inset-0 h-full w-full"
      :style="{ objectFit: size }"
    />
    <UILoading :visible="loading" cover :mask="false" />
  </div>
</template>

<script setup lang="ts">
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
</script>
