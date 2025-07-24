<script setup lang="ts">
import CodeView from '@/components/common/CodeView.vue'
import type { DefinitionKind } from '../../common'

defineProps<{
  kind?: DefinitionKind
  inlayHints?: string
}>()
</script>

<template>
  <div class="definition-overview-wrapper">
    <CodeView class="code" mode="inline" :inlay-hints="inlayHints"><slot></slot></CodeView>
  </div>
</template>

<style lang="scss" scoped>
.definition-overview-wrapper {
  display: flex;
  color: var(--ui-color-title);

  font-size: 12px;
  line-height: 1.75;

  .code {
    flex: 1 1 0;
    word-break: break-word;

    // Clear style from `code` in `MarkdownView`
    font-size: inherit;
    line-height: inherit;
    padding: 0;
    border-radius: 0;
    border: none;
    background: none;
  }
}
</style>
