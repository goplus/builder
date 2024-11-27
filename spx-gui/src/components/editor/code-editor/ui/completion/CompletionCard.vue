<script setup lang="ts">
import type { CompletionItem } from '.'

defineProps<{
  items: CompletionItem[]
}>()

function handleSelect(item: CompletionItem) {
  console.warn('TODO: handleSelect', item)
}
</script>

<template>
  <section class="completion-card">
    <ul class="list">
      <li v-for="item in items" :key="item.label" class="item" @click="handleSelect(item)">
        {{ item.label }}
      </li>
    </ul>
  </section>
</template>

<style lang="scss" scoped>
.completion-card {
  padding: 4px;
  background-color: #fff;
  border: 1px solid #333;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item {
  white-space: pre;
  cursor: pointer;

  &:hover {
    background-color: #aaa;
  }
}
</style>
