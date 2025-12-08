<script lang="ts" setup>
import ConfigPanel from './ConfigPanel.vue'
defineProps<{
  // sprite: Sprite
}>()
</script>

<template>
  <ConfigPanel>
    <slot></slot>
  </ConfigPanel>
</template>

<style lang="scss" scoped></style>
