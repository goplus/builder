<script setup lang="ts">
import { computed, ref, watchPostEffect } from 'vue'
import { UIDropdown, UIIcon, type DropdownPos } from '@/components/ui'
import { useDecorations } from '../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import MarkdownView from '../markdown/MarkdownView.vue'
import HoverCard from './HoverCard.vue'
import HoverCardContent from './HoverCardContent.vue'
import type { HoverController } from '.'
import {
  builtInCommandCopilotExplain,
  builtInCommandCopilotFixProblem,
  builtInCommandTranslate,
  type InternalAction
} from '../code-editor-ui'
import DiagnosticItem from '../markdown/DiagnosticItem.vue'
import { DiagnosticSeverity, type Action, type Diagnostic } from '../../common'
import { extractDocumentationExplanation, type EditorTranslationRequest } from '../../translation'

const props = defineProps<{
  controller: HoverController
}>()

const codeEditorUICtx = useCodeEditorUICtx()

const dropdownVisible = ref(false)
const dropdownPos = ref<DropdownPos>({ x: 0, y: 0 })
const hoveredTextCls = 'code-editor-hovered-text'

type TranslationTarget = EditorTranslationRequest & { contentIndex: number }

const translationTargets = computed<TranslationTarget[]>(() => {
  const hover = props.controller.hover
  const locale = codeEditorUICtx.ui.i18n.lang.value
  if (hover == null || locale === 'en') return []

  const targets: TranslationTarget[] = []
  const fixAction = hover.actions.find((action) => action.command === builtInCommandCopilotFixProblem)
  const diagnostic = (fixAction?.arguments[0] as { problem?: Diagnostic } | undefined)?.problem
  const diagnosticContentIndex = diagnostic == null ? -1 : hover.contents.length - 1
  if (hover.actions.some((action) => action.command === builtInCommandCopilotExplain)) {
    hover.contents.forEach((content, contentIndex) => {
      if (contentIndex === diagnosticContentIndex || typeof content.value !== 'string') return
      const source = extractDocumentationExplanation(content.value)
      if (source !== '') targets.push({ kind: 'documentation', source, locale, contentIndex })
    })
  }

  if (diagnostic != null && hover.contents.length > 0) {
    targets.push({
      kind: 'diagnostic',
      source: diagnostic.message,
      locale,
      contentIndex: hover.contents.length - 1,
      diagnosticSeverity: diagnostic.severity as 'error' | 'warning'
    })
  }
  return targets
})

const hoverActions = computed<Action[]>(() => {
  const hover = props.controller.hover
  if (hover == null) return []
  return [
    ...hover.actions,
    ...(translationTargets.value.length > 0
      ? [
          {
            command: builtInCommandTranslate,
            arguments: [translationTargets.value]
          }
        ]
      : [])
  ]
})

function getTranslationTarget(contentIndex: number) {
  return translationTargets.value.find((target) => target.contentIndex === contentIndex) ?? null
}

function getTranslationState(contentIndex: number) {
  return props.controller.translationState?.items.find((item) => item.contentIndex === contentIndex) ?? null
}

function getTranslationDiagnosticSeverity(contentIndex: number) {
  return (getTranslationTarget(contentIndex)?.diagnosticSeverity ?? DiagnosticSeverity.Error) as DiagnosticSeverity
}

function handleAction(action: InternalAction) {
  if (action.command !== builtInCommandTranslate) props.controller.hideHover()
}

// Use post effect to ensure the effect executed after effect of `useDecorations`
let renderedHover = props.controller.hover
watchPostEffect(async () => {
  const hover = props.controller.hover
  if (hover !== renderedHover) {
    props.controller.resetTranslation()
    renderedHover = hover
  }
  if (hover == null) {
    dropdownVisible.value = false
    return
  }

  let rect: DOMRect
  if (hover.range == null) {
    rect = hover.anchorRect
  } else {
    const editor = codeEditorUICtx.ui.editor
    editor.render(true) // ensure the decoration is rendered
    const decorationEl = editor.getDomNode()?.getElementsByClassName(hoveredTextCls)[0]
    if (decorationEl == null) throw new Error('Decoration element not found')
    rect = decorationEl.getBoundingClientRect()
  }
  dropdownVisible.value = true
  dropdownPos.value = {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height
  }
})

useDecorations(() => {
  const hover = props.controller.hover
  if (hover == null || hover.range == null) return []
  return [
    {
      range: {
        startLineNumber: hover.range.start.line,
        startColumn: hover.range.start.column,
        endLineNumber: hover.range.end.line,
        endColumn: hover.range.end.column
      },
      options: {
        isWholeLine: false,
        className: hoveredTextCls
      }
    }
  ]
})
</script>

<template>
  <UIDropdown
    :visible="dropdownVisible"
    trigger="manual"
    :pos="dropdownPos"
    placement="top-start"
    :offset="{ x: 0, y: 4 }"
  >
    <HoverCard
      v-if="controller.hover != null"
      :actions="hoverActions"
      @mouseenter="controller.emit('cardMouseEnter', $event)"
      @mouseleave="controller.emit('cardMouseLeave', $event)"
      @action="handleAction"
    >
      <HoverCardContent v-for="(content, i) in controller.hover.contents" :key="i">
        <MarkdownView class="hover-content" v-bind="content" />
        <div
          v-if="getTranslationState(i) != null"
          class="mt-2"
          :class="{ 'translation-loading': getTranslationState(i)?.status === 'loading' }"
        >
          <div
            v-if="getTranslationState(i)?.status === 'loading'"
            class="flex min-h-8 items-center gap-2 text-xs text-grey-700"
            role="status"
            aria-live="polite"
          >
            <UIIcon type="loading" class="text-primary-main" />
            <span>{{ $t({ en: 'Translating…', zh: '翻译中…' }) }}</span>
          </div>
          <DiagnosticItem
            v-else-if="getTranslationTarget(i)?.kind === 'diagnostic' && getTranslationState(i)?.translated != null"
            :severity="getTranslationDiagnosticSeverity(i)"
            class="w-full min-w-0"
          >
            {{ getTranslationState(i)?.translated }}
          </DiagnosticItem>
          <MarkdownView
            v-else-if="getTranslationState(i)?.status === 'success' && getTranslationState(i)?.translated != null"
            :value="getTranslationState(i)!.translated!"
          />
          <p v-else class="text-xs text-red-600" role="alert">
            {{ $t({ en: 'Translation unavailable', zh: '暂时无法翻译' }) }}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  </UIDropdown>
</template>

<style>
/* TODO: special style for hovered text? */
.code-editor-hovered-text {
  border-radius: 2px;
  background-color: var(--ui-color-grey-600);
}

.hover-content {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.hover-content pre,
.hover-content code {
  max-width: 100%;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
</style>
