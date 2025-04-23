<script setup lang="ts">
import { computed, ref } from 'vue'
import * as lsp from 'vscode-languageserver-protocol'
import { useMessageHandle } from '@/utils/exception'
import { UIDropdown } from '@/components/ui'
import { type Action, isBlockDefinitionKind } from '../../common'
import DefinitionOverviewWrapper from '../definition/DefinitionOverviewWrapper.vue'
import DefinitionDetailWrapper from '../definition/DefinitionDetailWrapper.vue'
import MarkdownView from '../markdown/MarkdownView.vue'
import { ChatExplainKind, builtInCommandCopilotExplain } from '../code-editor-ui'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import HoverCard from '../hover/HoverCard.vue'
import HoverCardContent from '../hover/HoverCardContent.vue'
import type { APIReferenceItem } from '.'

const props = defineProps<{
  item: APIReferenceItem
}>()

const codeEditorUICtx = useCodeEditorUICtx()

const handleInsert = useMessageHandle(
  () => {
    const parsed = codeEditorUICtx.ui.parseSnippet(props.item.insertSnippet)
    const snippet = parsed.toTextmateString()
    if (isBlockDefinitionKind(props.item.kind)) codeEditorUICtx.ui.insertBlockSnippet(snippet)
    else codeEditorUICtx.ui.insertInlineSnippet(snippet)
  },
  {
    en: 'Failed to insert',
    zh: '插入失败'
  }
).fn

const parsed = computed(() => {
  const parsed = codeEditorUICtx.ui.parseSnippet(props.item.insertSnippet)
  const overview = parsed.toString().replace(/{\n\s*\n}/g, '{}') // compress lambda expression
  const inlayHints: lsp.InlayHint[] = []
  ;(props.item.insertSnippetParameterHints ?? []).forEach((label, i) => {
    const placeholder = parsed.placeholders[i]
    const offset = parsed.offset(placeholder)
    inlayHints.push({
      label,
      position: { line: 0, character: offset },
      kind: lsp.InlayHintKind.Parameter
    })
  })
  const inlayHintsStr = JSON.stringify(inlayHints)
  return { overview, inlayHints: inlayHintsStr }
})

const hoverDropdown = ref<InstanceType<typeof UIDropdown> | null>(null)

const hoverCardActions = computed<Action[]>(() => {
  return [
    {
      command: builtInCommandCopilotExplain,
      arguments: [
        {
          kind: ChatExplainKind.Definition,
          overview: props.item.overview,
          definition: props.item.definition
        }
      ]
    }
  ]
})

function handlePostHoverAction() {
  // TODO: proper typing for UIDropdown exposed
  ;(hoverDropdown.value as any)?.setVisible(false)
}
</script>

<template>
  <UIDropdown ref="hoverDropdown" placement="bottom-start" show-arrow :offset="{ x: 0, y: 10 }">
    <template #trigger>
      <li class="api-reference-item" @click="handleInsert">
        <DefinitionOverviewWrapper class="overview" :kind="item.kind" :inlay-hints="parsed.inlayHints">{{
          parsed.overview
        }}</DefinitionOverviewWrapper>
      </li>
    </template>
    <HoverCard :actions="hoverCardActions" @action="handlePostHoverAction">
      <HoverCardContent>
        <DefinitionOverviewWrapper :kind="item.kind" :inlay-hints="parsed.inlayHints">{{
          parsed.overview
        }}</DefinitionOverviewWrapper>
        <DefinitionDetailWrapper>
          <MarkdownView v-bind="item.detail" />
        </DefinitionDetailWrapper>
      </HoverCardContent>
    </HoverCard>
  </UIDropdown>
</template>

<style lang="scss" scoped>
.api-reference-item {
  padding: 1px 7px;
  align-self: flex-start;
  max-width: 100%;
  border-radius: var(--ui-border-radius-1);
  border: 1px solid var(--ui-color-grey-400);
  background: var(--ui-color-grey-100);
  box-shadow: 0px 1px 8px 0px rgba(10, 13, 20, 0.05);
  transition: 0.2s;
  cursor: pointer;

  &:hover {
    background: var(--ui-color-grey-300);
    box-shadow: 0px 1px 2px 0px rgba(10, 13, 20, 0.03);
  }
}

.overview {
  word-break: break-all;
  padding: 2px 0 1px;

  :deep(> code) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
