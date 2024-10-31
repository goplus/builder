<script setup lang="ts">
defineProps<{
  text: string
  placeholder?: string
}>()

// TODO: more feature, see details in https://github.com/goplus/builder/issues/1060
</script>

<template>
  <div class="text-view">
    <template v-if="!!text">{{ text }}</template>
    <template v-else>{{ placeholder ?? '&nbsp;' }}</template>
  </div>
</template>

<style lang="scss" scoped>
.text-view {
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
