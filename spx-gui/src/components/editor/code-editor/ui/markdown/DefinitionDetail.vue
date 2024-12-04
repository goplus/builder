<script setup lang="ts">
import { computed } from 'vue'
import type { DefinitionDocumentationItem } from '../../common'
import { onStart } from '../../document-base/spx'
import DefinitionDetailWrapper from './DefinitionDetailWrapper.vue'
import MarkdownView from './MarkdownView.vue'

defineProps<{
  id: string
}>()

const documentation = computed<DefinitionDocumentationItem | null>(() => {
  return onStart // TODO: query from DocumentBase
})
</script>

<template>
  <DefinitionDetailWrapper>
    <MarkdownView v-if="documentation != null" v-bind="documentation.detail" />
    <MarkdownView v-else value="TODO: use default slot" />
  </DefinitionDetailWrapper>
</template>

<style lang="scss" scoped></style>
