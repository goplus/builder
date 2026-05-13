<script setup lang="ts">
import { computed } from 'vue'

type Size = 'medium' | 'large'

const props = withDefaults(
  defineProps<{
    size?: Size
  }>(),
  {
    size: 'medium'
  }
)

const widthClass = computed(() =>
  props.size === 'large' ? 'prototype-centered-large' : 'w-247 desktop-large:w-310'
)
</script>

<template>
  <section class="relative mx-auto self-center" :class="widthClass">
    <slot></slot>
  </section>
</template>

<style scoped>
.prototype-centered-large {
  width: min(calc(100% - 40px), 1492px);
}
</style>
