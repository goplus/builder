<script setup lang="ts">
import { computed, nextTick, onScopeDispose, ref, watchPostEffect } from 'vue'
import { UIDropdown, UIIcon, type DropdownPos } from '@/components/ui'
import { useDecorations } from '../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import MarkdownView from '../markdown/MarkdownView.vue'
import HoverCard from './HoverCard.vue'
import HoverCardContent from './HoverCardContent.vue'
import type { HoverController } from '.'
import { builtInCommandCopilotFixProblem, builtInCommandTranslate, type InternalAction } from '../code-editor-ui'
import DiagnosticItem from '../markdown/DiagnosticItem.vue'
import { DiagnosticSeverity, type Action, type Diagnostic } from '../../common'
import {
  extractDocumentationExplanation,
  formatDocumentationTranslation,
  type EditorTranslationFailureKind,
  type EditorTranslationRequest
} from '../../translation'
import { resolveHoverLayout, resolveHoverMaxHeight, type HoverPlacement } from './layout'
import TranslationFeedback from './TranslationFeedback.vue'

const props = defineProps<{
  controller: HoverController
}>()

const codeEditorUICtx = useCodeEditorUICtx()

const dropdownVisible = ref(false)
const dropdownPos = ref<DropdownPos>({ x: 0, y: 0 })
const hoverPlacement = ref<HoverPlacement>('top-start')
const hoverCardMaxHeight = ref(376)
const hoverCardRef = ref<InstanceType<typeof HoverCard> | null>(null)
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
  if (hover.range != null) {
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

function getTranslationFailureKind(contentIndex: number): EditorTranslationFailureKind | null {
  const status = getTranslationState(contentIndex)?.status
  if (status === 'failed' || status === 'rate-limited' || status === 'quota-exceeded') return status
  return null
}

function getTranslationDiagnosticSeverity(contentIndex: number) {
  return (getTranslationTarget(contentIndex)?.diagnosticSeverity ?? DiagnosticSeverity.Error) as DiagnosticSeverity
}

function getRenderedTranslation(contentIndex: number) {
  const translated = getTranslationState(contentIndex)?.translated
  if (translated == null || getTranslationTarget(contentIndex)?.kind !== 'documentation') return translated
  const source = props.controller.hover?.contents[contentIndex]?.value
  if (typeof source !== 'string') return translated
  return formatDocumentationTranslation(source, translated)
}

function updateHoverMaxHeight() {
  if (!dropdownVisible.value) return
  const anchorRect = {
    top: dropdownPos.value.y,
    bottom: dropdownPos.value.y + (dropdownPos.value.height ?? 0)
  }
  hoverCardMaxHeight.value = resolveHoverMaxHeight(hoverPlacement.value, anchorRect, window.innerHeight)
}

window.addEventListener('resize', updateHoverMaxHeight)
onScopeDispose(() => window.removeEventListener('resize', updateHoverMaxHeight))

async function handleAction(action: InternalAction) {
  if (action.command !== builtInCommandTranslate) {
    props.controller.hideHover()
    return
  }

  await nextTick()
  const firstTranslationIndex = translationTargets.value[0]?.contentIndex
  if (firstTranslationIndex == null) return
  hoverCardRef.value?.scrollToTranslation(firstTranslationIndex)
}

// Use post effect to ensure the effect executed after effect of `useDecorations`
let renderedHover = props.controller.hover
watchPostEffect(async () => {
  const hover = props.controller.hover
  const isNewHover = hover !== renderedHover
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
  if (isNewHover) {
    const layout = resolveHoverLayout(rect, window.innerHeight)
    hoverPlacement.value = layout.placement
    hoverCardMaxHeight.value = layout.maxHeight
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
    :placement="hoverPlacement"
    :flip="false"
    :offset="{ x: 0, y: 4 }"
  >
    <HoverCard
      v-if="controller.hover != null"
      ref="hoverCardRef"
      :actions="hoverActions"
      :max-height="hoverCardMaxHeight"
      @mouseenter="controller.emit('cardMouseEnter', $event)"
      @mouseleave="controller.emit('cardMouseLeave', $event)"
      @action="handleAction"
    >
      <HoverCardContent v-for="(content, i) in controller.hover.contents" :key="i">
        <MarkdownView class="hover-content" v-bind="content" />
        <div
          v-if="getTranslationState(i) != null"
          class="mt-3 w-full min-w-0 text-[13px]"
          :data-editor-translation-index="i"
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
          <TranslationFeedback v-else-if="getTranslationFailureKind(i) != null" :kind="getTranslationFailureKind(i)!" />
          <DiagnosticItem
            v-else-if="getTranslationTarget(i)?.kind === 'diagnostic' && getTranslationState(i)?.translated != null"
            :severity="getTranslationDiagnosticSeverity(i)"
            class="w-full min-w-0 self-stretch"
          >
            {{ getTranslationState(i)?.translated }}
          </DiagnosticItem>
          <MarkdownView
            v-else-if="getTranslationState(i)?.status === 'success' && getTranslationState(i)?.translated != null"
            class="hover-content"
            :flag="controller.hover.contents[i].flag"
            :value="getRenderedTranslation(i)!"
          />
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
  width: 100%;
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
