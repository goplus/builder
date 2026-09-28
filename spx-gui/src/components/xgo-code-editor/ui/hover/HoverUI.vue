<script setup lang="ts">
import { ref, watchPostEffect } from 'vue'
import { UIDropdown, UIIcon, type DropdownPos } from '@/components/ui'
import { useDecorations } from '../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import MarkdownView from '../markdown/MarkdownView.vue'
import HoverCard from './HoverCard.vue'
import HoverCardContent from './HoverCardContent.vue'
import type { HoverController } from '.'
import { builtInCommandTranslate, type InternalAction } from '../code-editor-ui'
import DiagnosticItem from '../markdown/DiagnosticItem.vue'
import { DiagnosticSeverity } from '../../common'

const props = defineProps<{
  controller: HoverController
}>()

const codeEditorUICtx = useCodeEditorUICtx()

const dropdownVisible = ref(false)
const dropdownPos = ref<DropdownPos>({ x: 0, y: 0 })
const hoveredTextCls = 'code-editor-hovered-text'

function getTranslationTarget(contentIndex: number) {
  return props.controller.hover?.translationTargets.find((target) => target.contentIndex === contentIndex) ?? null
}

function getTranslationState(contentIndex: number) {
  const state = props.controller.translationState
  return state?.contentIndex === contentIndex ? state : null
}

function getTranslationDiagnosticSeverity(contentIndex: number) {
  return (getTranslationTarget(contentIndex)?.diagnosticSeverity ?? DiagnosticSeverity.Error) as DiagnosticSeverity
}

function handleAction(action: InternalAction) {
  if (action.command !== builtInCommandTranslate) props.controller.hideHover()
}

// Use post effect to ensure the effect executed after effect of `useDecorations`
watchPostEffect(async () => {
  const hover = props.controller.hover
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
      :actions="controller.hover.actions"
      @mouseenter="controller.emit('cardMouseEnter', $event)"
      @mouseleave="controller.emit('cardMouseLeave', $event)"
      @action="handleAction"
    >
      <HoverCardContent v-for="(content, i) in controller.hover.contents" :key="i">
        <MarkdownView v-bind="content" />
        <div
          v-if="getTranslationState(i) != null"
          class="mt-2 border-t border-dividing-line-2 pt-2"
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
</style>
