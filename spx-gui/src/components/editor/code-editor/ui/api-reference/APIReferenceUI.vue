<script setup lang="ts">
import DefinitionOverviewWrapper from '../DefinitionOverviewWrapper.vue'
import DefinitionDetailWrapper from '../DefinitionDetailWrapper.vue'
import MarkdownView from '../MarkdownView.vue'
import type { APIReferenceController } from '.'

defineProps<{
  controller: APIReferenceController
}>()

function handleInsert() {
  console.warn('TODO: insert')
}

function handleExplain() {
  console.warn('TODO: explain')
}
</script>

<template>
  <ul class="api-reference">
    <li v-for="(item, i) in controller.itemsRef.value" :key="i" class="item">
      <DefinitionOverviewWrapper>{{ item.overview }}</DefinitionOverviewWrapper>
      <DefinitionDetailWrapper>
        <MarkdownView v-bind="item.detail" />
      </DefinitionDetailWrapper>
      <button type="button" @click="handleInsert">insert</button>
      <button type="button" @click="handleExplain">explain</button>
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.api-reference {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item {
  padding: 8px;
  border: 1px solid #333;
}
</style>
