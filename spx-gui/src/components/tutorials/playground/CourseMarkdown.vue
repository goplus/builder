<script setup lang="ts">
import MarkdownView from '@/components/common/markdown-vue/MarkdownView'

defineProps<{ value: string }>()
</script>

<template>
  <MarkdownView class="course-markdown flex flex-col gap-4 text-base/6 text-grey-900" :value="value" />
</template>

<style scoped>
.course-markdown :deep(h1),
.course-markdown :deep(h2),
.course-markdown :deep(h3) {
  color: var(--ui-color-title);
  font-weight: 500;
  font-size: 1.25em;
}
.course-markdown :deep(ul) {
  padding-left: 1.5em;
  list-style: disc;
}
.course-markdown :deep(ol) {
  padding-left: 1.5em;
  list-style: decimal;
}
.course-markdown :deep(strong) {
  font-weight: bold;
}
.course-markdown :deep(a) {
  color: var(--ui-color-turquoise-500);
  text-decoration: underline;
}
.course-markdown :deep(code) {
  font-family: var(--ui-font-family-code);
}
.course-markdown :deep(:not(pre) > code) {
  padding: 2px 4px;
  border: 1px solid var(--ui-color-grey-500);
  border-radius: 4px;
  background: var(--ui-color-grey-300);
  font-size: 0.92em;
  overflow-wrap: anywhere;
}
.course-markdown :deep(pre) {
  overflow-x: auto;
  padding: 12px;
  border-radius: 8px;
  background: var(--ui-color-grey-300);
}
.course-markdown :deep(blockquote) {
  padding-left: 12px;
  border-left: 2px solid var(--ui-color-grey-800);
}
</style>
