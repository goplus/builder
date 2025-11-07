<script setup lang="ts">
import { computed } from 'vue'
import { useAsyncComputedLegacy } from '@/utils/utils'
import { useSlotText } from '@/utils/vnode'
import { parseDefinitionId, type DefinitionDocumentationItem } from '../../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import DefinitionDetailWrapper from './DefinitionDetailWrapper.vue'
import MarkdownView from '../markdown/MarkdownView.vue'

const props = defineProps<{
  defId: string
}>()

const codeEditorCtx = useCodeEditorUICtx()

const documentation = useAsyncComputedLegacy<DefinitionDocumentationItem | null>(async () => {
  const defId = parseDefinitionId(props.defId)
  const documentBase = codeEditorCtx.ui.documentBase
  if (documentBase == null) return null
  return documentBase.getDocumentation(defId)
})

const childrenText = useSlotText('default', true)
const hasContent = computed(() => documentation.value != null || childrenText.value !== '')
</script>

<template>
  <DefinitionDetailWrapper v-if="hasContent">
    <MarkdownView v-if="documentation != null" v-bind="documentation.detail" />
    <MarkdownView v-else :value="childrenText" />
  </DefinitionDetailWrapper>
</template>

<style lang="scss" scoped></style>
