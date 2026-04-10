<script setup lang="ts">
defineProps<{
  text: string
  placeholder?: string
}>()

// TODO: more feature, see details in https://github.com/goplus/builder/issues/1060
</script>

<template>
  <div class="overflow-y-auto wrap-break-word whitespace-pre-wrap">
    <template v-if="!!text">{{ text }}</template>
    <template v-else>{{ placeholder ?? '&nbsp;' }}</template>
  </div>
</template>
