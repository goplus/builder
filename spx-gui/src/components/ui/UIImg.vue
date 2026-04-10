<template>
  <div v-bind="rootAttrs" :class="rootClass" :style="imgStyle">
    <UILoading :visible="loading" cover :mask="false" />
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs, type CSSProperties, type StyleValue } from 'vue'

import { cn, type ClassValue } from './utils'
import UILoading from './loading/UILoading.vue'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    src: string | null
    loading?: boolean
    size?: 'contain' | 'cover'
  }>(),
  {
    // TODO: loading for public URL fetching
    loading: false,
    size: 'contain'
  }
)

const attrs = useAttrs()
const rootClass = computed(() =>
  cn(
    // Disable image smoothing to keep pixelated look, so it looks good for pixel art assets.
    // See details in https://github.com/goplus/builder/issues/2214.
    'relative flex items-center justify-center bg-center bg-no-repeat [image-rendering:pixelated]',
    attrs.class as ClassValue
  )
)
const rootAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const backgroundStyle = computed<CSSProperties | null>(() => {
  if (props.src == null) return null
  return {
    backgroundImage: `url("${props.src}")`,
    backgroundSize: props.size
  }
})

const imgStyle = computed<StyleValue | null>(() => {
  if (attrs.style == null) {
    return backgroundStyle.value
  }
  if (backgroundStyle.value == null) {
    return attrs.style as StyleValue
  }
  return [attrs.style as StyleValue, backgroundStyle.value] as StyleValue
})
</script>
