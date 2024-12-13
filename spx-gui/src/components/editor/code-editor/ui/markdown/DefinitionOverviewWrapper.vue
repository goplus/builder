<script setup lang="ts">
import type { DefinitionKind } from '../../common'
import DefinitionIcon from '../definition/DefinitionIcon.vue'
import CodeView from './CodeView.vue'

defineProps<{
  kind?: DefinitionKind
}>()
</script>

<template>
  <h4 class="definition-overview-wrapper">
    <DefinitionIcon v-if="kind != null" class="icon" :kind="kind" />
    <CodeView class="code" mode="inline"><slot></slot></CodeView>
  </h4>
</template>

<style lang="scss" scoped>
.definition-overview-wrapper {
  color: var(--ui-color-title);

  &:not(:last-child) {
    margin-bottom: 4px;
  }

  .code {
    // Clear style from `code` in `MarkdownView`
    font-size: inherit;
    padding: 0;
    border-radius: 0;
    border: none;
    background: none;
  }
}

.icon {
  margin-top: 2px;
  margin-right: 4px;
}
</style>
