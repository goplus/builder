<!-- RouterLink + UILink -->

<script setup lang="ts">
import { RouterLink, type RouterLinkProps } from 'vue-router'

const props = withDefaults(
  defineProps<
    RouterLinkProps & {
      type?: 'primary' | 'boring'
    }
  >(),
  {
    type: 'primary'
  }
)
</script>

<template>
  <RouterLink v-bind="props" class="router-ui-link" :class="`type-${type}`">
    <slot />
  </RouterLink>
</template>

<style lang="scss" scoped>
@import '@/components/ui/link.scss';

.router-ui-link {
  &.type-primary {
    @include link(primary);
  }
  &.type-boring {
    @include link(boring);
  }
}
</style>
