<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import * as lsp from 'vscode-languageserver-protocol'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { untilTaskScheduled } from '@/utils/utils'
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
import APIReferenceActions from './APIReferenceActions.vue'

const props = defineProps<{
  item: APIReferenceItem
  interactionDisabled: boolean
  showDescription?: boolean
}>()

const i18n = useI18n()
const codeEditor = useCodeEditor()
const codeEditorUICtx = useCodeEditorUICtx()

const description = computed(() => {
  const detail = props.item.detail.value
  return typeof detail === 'string' ? detail : i18n.t(detail)
})

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

const hoverCardVisible = ref(false)
const actionsMenuVisible = ref(false)
const hoverCardRef = ref<InstanceType<typeof HoverCard>>()

const actions = computed<Action[]>(() => {
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

function updateHoverCardVisible(visible: boolean) {
  // The action menu is teleported outside the hover card.
  if (!visible && actionsMenuVisible.value) return
  hoverCardVisible.value = visible
}

async function closeInactiveHoverCard() {
  // Wait for Escape focus restoration or Tab's default focus movement.
  await nextTick()
  await untilTaskScheduled('user-visible')
  if (actionsMenuVisible.value) return
  const card = hoverCardRef.value?.$el as HTMLElement | undefined
  if (card != null && !card.matches(':hover, :focus-within')) hideDropdown()
}

function handleActionsMenuVisibleChange(visible: boolean) {
  actionsMenuVisible.value = visible
  if (!visible) void closeInactiveHoverCard()
}

function hideDropdown() {
  actionsMenuVisible.value = false
  hoverCardVisible.value = false
}

watch(
  () => props.interactionDisabled || props.showDescription,
  (disabled) => {
    if (disabled) hideDropdown()
  }
)

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
  <UIDropdown
    :visible="hoverCardVisible"
    placement="bottom-start"
    :offset="{ x: 0, y: 4 }"
    :disabled="interactionDisabled || showDescription"
    @update:visible="updateHoverCardVisible"
  >
    <template #trigger>
      <li
        v-radar="{
          name: parsed.overview,
          desc: ''
        }"
        class="api-reference-item"
        :class="{ 'search-result': showDescription }"
        draggable="true"
        @dragstart="handleDragStart"
        @mousedown.passive="handleMouseDown"
        @mouseup.passive="handleMouseUp"
        @click="handleInsert"
      >
        <div :class="{ 'flex items-center gap-2': showDescription }">
          <DefinitionOverviewWrapper
            class="overview min-w-0 flex-[1_1_0]"
            :kind="item.kind"
            :inlay-hints="parsed.inlayHints"
          >
            {{ parsed.overview }}
          </DefinitionOverviewWrapper>
          <APIReferenceActions
            v-if="showDescription"
            class="actions"
            :actions="actions"
            compact
            :disabled="interactionDisabled"
          />
        </div>
        <p v-if="showDescription" class="mt-1 text-xs text-hint-1">{{ description }}</p>
      </li>
    </template>
    <HoverCard ref="hoverCardRef" :actions="actions" @focusout="closeInactiveHoverCard">
      <template #actions>
        <APIReferenceActions
          :actions="actions"
          :disabled="interactionDisabled"
          @menu-visible-change="handleActionsMenuVisibleChange"
          @dismiss="hideDropdown"
          @action="hideDropdown"
        />
      </template>
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
.api-reference-item {
  align-self: flex-start;
  max-width: 100%;
  padding: 0 6px;
  border-radius: var(--ui-border-radius-sm);
  background: var(--ui-color-grey-100);
  transition: all 0.2s;
  cursor: pointer;
  /* 42px for sticky title, to ensure the item correctly scrolled into view. */
  scroll-margin-top: 42px;
  /* With 16px offset it is easier to find when scrolled into view. */
  scroll-margin-bottom: 16px;
  /* Preserve `border-radius` when dragging, see details: https://github.com/react-dnd/react-dnd/issues/788 */
  transform: translate(0, 0);
}

.api-reference-item:hover {
  background: var(--ui-color-grey-300);
}

.api-reference-item.search-result {
  align-self: stretch;
  padding-top: 8px;
  padding-bottom: 8px;
}

@media (hover: hover) and (pointer: fine) {
  .api-reference-item.search-result .actions {
    opacity: 0;
    pointer-events: none;
  }

  .api-reference-item.search-result:hover .actions,
  .api-reference-item.search-result:focus-within .actions,
  .api-reference-item.search-result .actions[data-menu-open='true'] {
    opacity: 1;
    pointer-events: auto;
  }
}

.api-reference-item.before-dragging {
  /* Adjust transparency for dragging to avoid visual obstruction */
  background-color: rgba(from var(--ui-color-grey-300) r g b / 0.6);
}

.api-reference-item.before-dragging .overview {
  opacity: 0.6;
}

.overview {
  padding-top: 2px;
  padding-bottom: 1px;
  word-break: break-all;
}

.overview :deep(> code) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ui-color-hint-2);
}
</style>
