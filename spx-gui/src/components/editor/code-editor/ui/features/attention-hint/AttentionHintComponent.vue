<script setup lang="ts">
import { AttentionHint } from './attention-hint'
import {
  type AttentionHintDecoration,
  AttentionHintLevelEnum,
  type DocPreview,
  EditorUI
} from '@/components/editor/code-editor/EditorUI'
import { onMounted, onUnmounted } from 'vue'
import { debounce } from '@/utils/utils'

const props = defineProps<{
  attentionHint: AttentionHint
  ui: EditorUI
}>()

const updateAttentionHint = debounce(async () => {
  const model = props.attentionHint.editor.getModel()
  if (!model) return
  props.ui.requestAttentionHintsProviderResolve(
    model,
    (hints: AttentionHintDecoration[]) => {
      props.attentionHint.setAttentionHintDecorations(hints)
      props.attentionHint.attentionHintDecoration.clear()
      props.attentionHint.attentionHintDecoration.set(
        hints.map((hint) => {
          // todo: add hover layer content
          switch (hint.level) {
            case AttentionHintLevelEnum.WARNING:
              return props.attentionHint.createWarningAttentionHint(hint.range, hint.message)
            case AttentionHintLevelEnum.ERROR:
              return props.attentionHint.createErrorAttentionHint(hint.range, hint.message)
          }
        })
      )
    },
    {
      signal: props.attentionHint.abortController.signal
    }
  )
}, 300)

const { dispose } = props.attentionHint.editor.onDidChangeModelContent(updateAttentionHint)

onMounted(() => {
  updateAttentionHint()
})

onUnmounted(() => {
  dispose()
})
</script>

<template>
  <slot></slot>
</template>

<style lang="scss">
// this is global css and active in monaco editor code line, add `.view-line` to avoid style override by monaco editor
.view-line {
  .attention-hint__warning-text {
    z-index: 10;
    width: 0;
    color: #948500;
    font-size: 0.8em;
    font-style: italic;
    padding-left: 2em;
    user-select: none;
    background: none;
  }

  .attention-hint__error-text {
    z-index: 10;
    width: 0;
    color: #b3070d;
    font-size: 0.8em;
    font-style: italic;
    padding-left: 2em;
    user-select: none;
    background: none;
  }
}

.attention-hint__warning {
  z-index: -1;
  user-select: none;
  background: #faf8f5;
}

.attention-hint__error {
  z-index: -1;
  user-select: none;
  background: #a7070c10;
}
</style>
