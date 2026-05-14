<script setup lang="ts">
const wrapperClassMap = {
  medium: 'mx-auto w-[calc(100%-40px)] max-w-[988px]',
  large: 'mx-auto w-[calc(100%-200px)] max-w-[1240px]'
} as const

withDefaults(
  defineProps<{
    size?: 'medium' | 'large'
  }>(),
  {
    size: 'medium'
  }
)
</script>

<template>
  <section :class="wrapperClassMap[size]">
    <slot />
  </section>
</template>
