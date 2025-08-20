<script setup lang="ts">
import { computed, ref } from 'vue'
import * as lsp from 'vscode-languageserver-protocol'
import { useMessageHandle } from '@/utils/exception'
import { UIDropdown } from '@/components/ui'
import { type Action, setDdiDragData } from '../../common'
import DefinitionOverviewWrapper from '../definition/DefinitionOverviewWrapper.vue'
import DefinitionDetailWrapper from '../definition/DefinitionDetailWrapper.vue'
import MarkdownView from '../markdown/MarkdownView.vue'
import { CopilotExplainKind, builtInCommandCopilotExplain } from '../code-editor-ui'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import HoverCard from '../hover/HoverCard.vue'
import HoverCardContent from '../hover/HoverCardContent.vue'
import type { APIReferenceItem } from '.'

const props = defineProps<{
  item: APIReferenceItem
  interactionDisabled: boolean
}>()

const codeEditorUICtx = useCodeEditorUICtx()

const handleInsert = useMessageHandle(() => codeEditorUICtx.ui.insertDefinition(props.item), {
  en: 'Failed to insert',
  zh: '插入失败'
}).fn

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
          kind: CopilotExplainKind.Definition,
          overview: props.item.overview,
          definition: props.item.definition
        }
      ]
    }
  ]
})

function hideDropdown() {
  // TODO: proper typing for UIDropdown exposed
  ;(hoverDropdown.value as any)?.setVisible(false)
}

// Apply styling class BEFORE the `dragstart` event triggers to ensure
// the visual effect is applied during dragging (just another weird Chrome requirement).
// So we add the class on `mousedown` and remove it after `dragstart` or on `mouseup`.
const beforeDraggingClz = 'before-dragging'

function handleDragStart(e: DragEvent) {
  const itemEl = e.currentTarget as HTMLElement
  setTimeout(() => itemEl.classList.remove(beforeDraggingClz), 0)
  setDdiDragData(e.dataTransfer!, props.item)
  hideDropdown()
}

function handleMouseDown(e: MouseEvent) {
  const itemEl = e.currentTarget as HTMLElement
  itemEl.classList.add(beforeDraggingClz)
  hideDropdown()
}

function handleMouseUp(e: MouseEvent) {
  const itemEl = e.currentTarget as HTMLElement
  itemEl.classList.remove(beforeDraggingClz)
}

// TODO: Update radar & copilot to support large list
</script>

<template>
  <UIDropdown ref="hoverDropdown" placement="bottom-start" :offset="{ x: 0, y: 4 }" :disabled="interactionDisabled">
    <template #trigger>
      <li
        v-radar="{
          name: parsed.overview,
          desc: ''
        }"
        class="api-reference-item"
        draggable="true"
        @dragstart="handleDragStart"
        @mousedown.passive="handleMouseDown"
        @mouseup.passive="handleMouseUp"
        @click="handleInsert"
      >
        <DefinitionOverviewWrapper class="overview" :kind="item.kind" :inlay-hints="parsed.inlayHints">{{
          parsed.overview
        }}</DefinitionOverviewWrapper>
      </li>
    </template>
    <HoverCard :actions="hoverCardActions" @action="hideDropdown">
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
  scroll-margin-top: 42px; // 42px for sticky title, to ensure the item correctly scrolled-into-view

  // Preserve `border-radius` when dragging, see details: https://github.com/react-dnd/react-dnd/issues/788
  transform: translate(0, 0);

  &:hover {
    background: var(--ui-color-grey-300);
    box-shadow: 0px 1px 2px 0px rgba(10, 13, 20, 0.03);
  }

  &.before-dragging {
    // Adjust transparency for dragging to avoid visual obstruction
    background-color: rgba(from var(--ui-color-grey-300) r g b / 0.6);
    .overview {
      opacity: 0.6;
    }
  }
}

.overview {
  word-break: break-all;
  padding: 2px 0 1px;

  :deep(> code) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--ui-color-hint-2);
  }
}
</style>
