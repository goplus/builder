<script setup lang="ts">
defineProps<{
  text?: string
  placeholder?: string
}>()
</script>

<template>
  <p class="whitespace-pre-wrap leading-6 text-grey-800">
    {{ text && text.length > 0 ? text : placeholder }}
  </p>
</template>
