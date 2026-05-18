<script setup lang="ts">
defineProps<{
  text?: string
  placeholder?: string
}>()
</script>

<template>
  <div class="overflow-y-auto whitespace-pre-wrap break-words text-base text-text">
    {{ text && text.length > 0 ? text : placeholder }}
  </div>
</template>
