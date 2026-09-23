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
import { useCodeEditor } from '../../context'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import HoverCard from '../hover/HoverCard.vue'
import HoverCardContent from '../hover/HoverCardContent.vue'
import type { APIReferenceItem } from '.'

const props = withDefaults(
  defineProps<{
    item: APIReferenceItem
    interactionDisabled: boolean
    blockStyle?: boolean
  }>(),
  {
    blockStyle: false
  }
)

const codeEditor = useCodeEditor()
const codeEditorUICtx = useCodeEditorUICtx()

const handleInsert = useMessageHandle(
  () =>
    codeEditor.history.doAction({ name: { en: 'Insert code', zh: '插入代码' } }, () =>
      codeEditorUICtx.ui.insertDefinition(props.item)
    ),
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
          name: 'api-reference',
          label: parsed.overview,
          desc: '',
          attrs: {
            package: item.definition.package,
            name: item.definition.name,
            'overload-id': item.definition.overloadId
          }
        }"
        class="api-reference-item max-w-full cursor-pointer self-start translate-x-0 rounded-sm bg-grey-100 px-1.5 transition-all duration-200 hover:bg-grey-300 [scroll-margin-bottom:16px] [scroll-margin-top:42px] [&.before-dragging]:bg-grey-300/60 [&.before-dragging_.overview]:opacity-60"
        :class="{
          'block-style relative flex min-h-9 w-fit max-w-none items-center rounded-md border border-grey-500 py-1.5 pr-2.5 pl-6.5 shadow-[0_2px_8px_rgba(15,23,42,0.08)] hover:border-primary-main hover:bg-grey-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)]':
            props.blockStyle,
          'cursor-grab [&.before-dragging]:cursor-grabbing': props.blockStyle,
          '[&_.overview]:break-normal': props.blockStyle
        }"
        draggable="true"
        @dragstart="handleDragStart"
        @mousedown.passive="handleMouseDown"
        @mouseup.passive="handleMouseUp"
        @click="handleInsert"
      >
        <DefinitionOverviewWrapper
          class="overview break-all pt-0.5 pb-px"
          :kind="item.kind"
          :inlay-hints="parsed.inlayHints"
        >
          {{ parsed.overview }}
        </DefinitionOverviewWrapper>
      </li>
    </template>
    <HoverCard :actions="hoverCardActions" @action="hideDropdown">
      <HoverCardContent>
        <DefinitionOverviewWrapper :kind="item.kind" :inlay-hints="parsed.inlayHints">
          {{ parsed.overview }}
        </DefinitionOverviewWrapper>
        <DefinitionDetailWrapper>
          <MarkdownView v-bind="item.detail" />
        </DefinitionDetailWrapper>
      </HoverCardContent>
    </HoverCard>
  </UIDropdown>
</template>

<style scoped>
.api-reference-item.block-style::before {
  position: absolute;
  top: 50%;
  left: 10px;
  width: 8px;
  height: 16px;
  content: '';
  background-image: radial-gradient(circle, var(--ui-color-grey-700) 1.5px, transparent 1.5px);
  background-size: 4px 5px;
  opacity: 0.65;
  transform: translateY(-50%);
}

.api-reference-item.block-style .overview :deep(> code) {
  overflow: visible;
  text-overflow: clip;
}

.overview :deep(> code) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ui-color-hint-2);
}
</style>
