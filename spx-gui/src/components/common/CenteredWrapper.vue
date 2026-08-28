<script setup lang="ts">
import { computed } from 'vue'

type Size = 'medium' | 'large'

const props = withDefaults(
  defineProps<{
    size?: Size
    fluid?: boolean
  }>(),
  {
    size: 'medium',
    fluid: false
  }
)

const widthClass = computed(() => {
  if (props.fluid) {
    return props.size === 'large'
      ? 'w-full max-w-[1240px] desktop-large:max-w-[1492px]'
      : 'w-full max-w-[988px] desktop-large:max-w-[1240px]'
  }
  return props.size === 'large' ? 'w-310 desktop-large:w-373' : 'w-247 desktop-large:w-310'
})
</script>

<template>
  <section class="relative mx-auto self-center" :class="widthClass">
    <slot></slot>
  </section>
</template>
