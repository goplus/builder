<script setup lang="ts">
import type { APIReference } from '.'
import DefinitionOverviewWrapper from './DefinitionOverviewWrapper.vue'
import DefinitionDetailWrapper from './DefinitionDetailWrapper.vue'
import MarkdownView from './MarkdownView.vue'

defineProps<{
  apiReference: APIReference
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
    <li v-for="(item, i) in apiReference.items" :key="i" class="item">
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
  padding: 1em;
}
</style>
