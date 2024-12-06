<script setup lang="ts">
import { parseDefinitionId, type DefinitionDocumentationItem } from '../../common'
import { useCodeEditorCtx } from '../CodeEditorUI.vue'
import DefinitionDetailWrapper from './DefinitionDetailWrapper.vue'
import MarkdownView from './MarkdownView.vue'
import { useAsyncComputed } from '@/utils/utils'

const props = defineProps<{
  defId: string
}>()

const codeEditorCtx = useCodeEditorCtx()

const documentation = useAsyncComputed<DefinitionDocumentationItem | null>(async () => {
  const defId = parseDefinitionId(props.defId)
  const documentBase = codeEditorCtx.ui.documentBase
  if (documentBase == null) return null
  return documentBase.getDocumentation(defId)
})
</script>

<template>
  <DefinitionDetailWrapper>
    <MarkdownView v-if="documentation != null" v-bind="documentation.detail" />
    <MarkdownView v-else value="TODO: use default slot" />
  </DefinitionDetailWrapper>
</template>

<style lang="scss" scoped></style>
