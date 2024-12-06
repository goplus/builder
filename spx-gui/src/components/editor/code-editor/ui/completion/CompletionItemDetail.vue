<script setup lang="ts">
import MarkdownView from '../markdown/MarkdownView.vue'
import type { InternalCompletionItem } from '.'

defineProps<{
  item: InternalCompletionItem
}>()
</script>

<template>
  <div class="completion-item-detail">
    <MarkdownView class="content" v-bind="item.documentation" />
  </div>
</template>

<style lang="scss" scoped>
.completion-item-detail {
  padding: 8px;
}
</style>
