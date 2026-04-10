<script setup lang="ts">
import { computed } from 'vue'

// different size of centered-content for different pages
type Size = 'medium' | 'large'

const props = withDefaults(
  defineProps<{
    size?: Size
  }>(),
  {
    size: 'medium'
  }
)

const widthClass = computed(() => (props.size === 'large' ? 'w-310 desktop-large:w-373' : 'w-247 desktop-large:w-310'))
</script>

<template>
  <section class="relative mx-auto self-center" :class="widthClass">
    <slot></slot>
  </section>
</template>
