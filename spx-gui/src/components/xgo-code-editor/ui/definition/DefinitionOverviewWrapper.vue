<script setup lang="ts">
import CodeView from '@/components/common/CodeView.vue'
import type { DefinitionKind } from '../../common'

defineProps<{
  kind?: DefinitionKind
  inlayHints?: string
}>()
</script>

<template>
  <div class="flex text-xs/[1.75] text-title">
    <CodeView class="def-overview-code" mode="inline" :inlay-hints="inlayHints"><slot></slot></CodeView>
  </div>
</template>

<style scoped>
.def-overview-code.code-view {
  flex: 1 1 0;
  word-break: break-word;

  /* Clear style from `code` in `MarkdownView`. */
  font-size: inherit;
  line-height: inherit;
  padding: 0;
  border-radius: 0;
  border: none;
  background: none;
}
</style>
