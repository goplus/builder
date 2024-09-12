<script setup lang="ts">
import { debounce } from '@/utils/utils'
import { EditorUI } from '../../../EditorUI'
import { InlayHint } from './inlay-hint'
import { onMounted } from 'vue'

const props = defineProps<{
  inlayHint: InlayHint
  ui: EditorUI
}>()

const updateInlayHint = debounce(async () => {
  const model = props.inlayHint.editor.getModel()
  if (!model) return
  props.inlayHint.abortController.abort()
  props.inlayHint.abortController = new AbortController()
  const inlayHints = await props.ui.requestInlayHintProviderResolve(model, {
    signal: props.inlayHint.abortController.signal
  })

  props.inlayHint.textDecorationsCollection.clear()
  props.inlayHint.textDecorationsCollection.set(
    inlayHints
      .filter(
        (inlayHint) =>
          // filter special param like playlist icon param
          !(typeof inlayHint.content === 'string' && ['mediaName'].includes(inlayHint.content))
      )
      .map((inlayHint) => {
        switch (inlayHint.style) {
          case 'icon':
            return props.inlayHint.createIconDecoration(
              inlayHint.position.lineNumber,
              inlayHint.position.column
            )
          case 'tag':
            return props.inlayHint.createTagDecoration(
              inlayHint.position.lineNumber,
              inlayHint.position.column,
              // we know content is string when style is tag, here use force type
              inlayHint.content as string
            )
          case 'text':
            return props.inlayHint.createParamDecoration(
              inlayHint.position.lineNumber,
              inlayHint.position.column,
              // we know content is string when style is text, here use force type
              inlayHint.content + ':'
            )
        }
      })
  )
}, 300)

props.inlayHint.editor.onDidChangeModelContent(updateInlayHint)

props.inlayHint.eventDisposeHandler.push(
  props.inlayHint.editor.onMouseDown((e) => {
    const element = e.target.element
    if (element?.classList.contains('inlay-hint__icon-playlist')) {
      props.ui.completionMenu?.showCompletionMenu()
    }
  }).dispose
)

onMounted(() => {
  updateInlayHint()
})
</script>

<template>
  <slot></slot>
</template>

<style lang="scss">
// this is global css and active in monaco editor code line, add `.view-line` to avoid style override by monaco editor
.view-line {
  .inlay-hint__param::after {
    font-size: 0.8em;
    margin-right: 0.5em;
    color: rgba(0, 0, 0, 0.3);
    vertical-align: middle;
  }

  .inlay-hint__icon-playlist {
    cursor: pointer;
    &::after {
      content: '';
      display: inline-block;
      width: 0.75em;
      height: 0.75em;
      background-image: var(--monaco-editor-icon-playlist);
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center center;
    }
  }

  .inlay-hint__tag::after {
    color: rgba(0, 0, 0, 0.3);
    padding: 2px 4px;
    margin: 0 2px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 2px;
    font-size: 0.85em;
    vertical-align: top;
  }
}
</style>
