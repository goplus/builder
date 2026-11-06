<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    href?: string
    type?: 'primary' | 'boring'
  }>(),
  {
    href: 'javascript:;',
    type: 'primary'
  }
)

const linkClass = computed(() => (props.type === 'primary' ? 'link-primary' : 'link-boring'))
</script>

<template>
  <a :class="linkClass" :href="href">
    <slot></slot>
  </a>
</template>
