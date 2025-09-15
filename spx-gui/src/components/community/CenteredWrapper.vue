<template>
  <section class="centered" :class="`size-${size}`">
    <slot></slot>
  </section>
</template>

<script setup lang="ts">
// different size of centered-content for different pages
type Size = 'medium' | 'large'

withDefaults(
  defineProps<{
    size?: Size
  }>(),
  {
    size: 'medium'
  }
)
</script>

<style scoped lang="scss">
@import '@/components/ui/responsive';

.centered {
  position: relative;
  margin-left: auto;
  margin-right: auto;

  &.size-medium {
    width: 988px;

    @include responsive(desktop-large) {
      width: 1240px;
    }
  }

  &.size-large {
    width: 1240px;

    @include responsive(desktop-large) {
      width: 1492px;
    }
  }

  &.size-medium,
  &.size-large {
    @include responsive(mobile) {
      width: 95%;
    }
  }
}
</style>
