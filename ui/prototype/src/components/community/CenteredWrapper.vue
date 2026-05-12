<script setup lang="ts">
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
  <section class="centered-wrapper" :class="`centered-wrapper-${size}`">
    <slot />
  </section>
</template>
