<!-- RouterLink + UILink -->

<script setup lang="ts">
import { computed } from 'vue'
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

const linkClass = computed(() => (props.type === 'primary' ? 'link-primary' : 'link-boring'))
</script>

<template>
  <RouterLink v-bind="props" :class="linkClass">
    <slot />
  </RouterLink>
</template>
