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

const widthClass = computed(() =>
  props.size === 'large' ? 'w-[1240px] desktop-large:w-[1492px]' : 'w-[988px] desktop-large:w-[1240px]'
)
</script>

<template>
  <section class="relative mx-auto self-center" :class="widthClass">
    <slot />
  </section>
</template>
