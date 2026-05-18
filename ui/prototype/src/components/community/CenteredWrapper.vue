<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    size?: 'medium' | 'large'
  }>(),
  {
    size: 'medium'
  }
)

const widthClass = computed(() => (props.size === 'large' ? 'w-310 desktop-large:w-373' : 'w-247 desktop-large:w-310'))
</script>

<template>
  <section class="relative mx-auto self-center" :class="widthClass">
    <slot />
  </section>
</template>
