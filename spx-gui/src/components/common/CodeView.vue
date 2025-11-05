<script setup lang="ts">
import { computed } from 'vue'
import type { ElementContent, RootContent } from 'hast'
import { splitTokens, type ShikiTransformer } from 'shiki/core'
import * as lsp from 'vscode-languageserver-protocol'
import { getHighlighter, theme, tabSize } from '@/utils/spx/highlighter'
import { useAsyncComputedLegacy } from '@/utils/utils'
import { useSlotTextLegacy } from '@/utils/vnode'

export type InlayHints = Array<lsp.InlayHint>

const props = withDefaults(
  defineProps<{
    /** Only `spx` supported now. */
    language?: string
    mode: 'block' | 'inline'
    /** If show line numbers */
    lineNumbers?: boolean
    /** Is code for addition */
    addition?: boolean
    /** Is code for deletion */
    deletion?: boolean
    /** JSON string for `InlayHints` */
    inlayHints?: string
  }>(),
  {
    language: 'spx',
    lineNumbers: false,
    addition: false,
    deletion: false,
    inlayHints: undefined
  }
)

const childrenText = useSlotTextLegacy()
const codeToDisplay = computed(() => childrenText.value.replace(/\n$/, '')) // omit last line break when displaying
const highlighter = useAsyncComputedLegacy(getHighlighter)
const inlayHintsComputed = computed(() => {
  if (props.inlayHints == null) return []
  try {
    return JSON.parse(props.inlayHints) as InlayHints
  } catch (e) {
    console.warn('Failed to parse inlay hints:', e)
    return []
  }
})

const hasLineNumbers = computed(() => {
  return props.lineNumbers && props.mode === 'block' && codeToDisplay.value.split('\n').length > 1
})

const codeHtml = computed(() => {
  if (highlighter.value == null) return ''
  // Sometimes Copilot makes mistakes about go/xgo, we correct it here.
  const lang = ['spx', 'xgo', 'go'].includes(props.language) ? 'spx' : 'plaintext'
  const structure = props.mode === 'block' ? 'classic' : 'inline'
  const transformers: ShikiTransformer[] = []
  if (props.mode === 'inline') {
    // Now inlay hints are only supported in inline mode
    transformers.push(makeInlineInlayHintTransformer(inlayHintsComputed.value))
  }
  return highlighter.value.codeToHtml(codeToDisplay.value, {
    lang,
    structure,
    theme,
    transformers
  })
})
</script>

<script lang="ts">
/**
 * Make shiki transformer to render inlay hints in inline code.
 * Shiki decorations don't work with `structure: inline`, so we need to implement a custom transformer.
 * See details in https://github.com/shikijs/shiki/issues/992.
 */
function makeInlineInlayHintTransformer(inlayHints: InlayHints): ShikiTransformer {
  return {
    name: 'my-decoration-transformer',
    tokens(tokens) {
      if (inlayHints.length === 0) return
      const breakpoints = inlayHints.map((h) => h.position.character)
      const splitted = splitTokens(tokens, breakpoints)
      return splitted
    },
    root(hast) {
      if (inlayHints.length === 0) return
      let text = ''
      const children: RootContent[] = []
      for (let i = 0; i < hast.children.length; i++) {
        const offset = text.length
        const hint = inlayHints.find((h) => h.position.character === offset)
        if (hint != null) {
          // For now we only support string labels & `kind: Parameter`
          const label = typeof hint.label === 'string' ? hint.label : ''
          children.push({
            type: 'element',
            tagName: 'span',
            properties: {
              class: 'param-inlay-hint'
            },
            children: [
              {
                type: 'text',
                value: label
              }
            ]
          })
        }
        const child = hast.children[i]
        if (!(child.type === 'element' && child.tagName === 'span')) {
          // for `structure: inline` only
          throw new Error(`Expected a span element, but got ${child.type}`)
        }
        text += stringifyElCnt(child)
        children.push(child)
      }
      hast.children = children
    }
  }
}

function stringifyElCnt(el: ElementContent): string {
  if (el.type === 'text') return el.value
  if (el.type === 'element') return el.children.map(stringifyElCnt).join('')
  return ''
}
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <code v-if="mode === 'inline'" class="code-view" :style="{ tabSize }" v-html="codeHtml"></code>
  <div
    v-else
    class="code-view block"
    :class="{ 'has-line-numbers': hasLineNumbers, addition, deletion }"
    :style="{ tabSize }"
    v-html="codeHtml"
  ></div>
</template>

<style lang="scss" scoped>
.code-view {
  font-family: var(--ui-font-family-code);
  font-size: 1em;

  :deep(.param-inlay-hint) {
    color: var(--ui-color-hint-2) !important;
    &::after {
      content: ':';
    }
  }
}

.block :deep(pre) {
  min-width: fit-content;
}

.has-line-numbers {
  container-type: inline-size;

  :deep(pre) {
    position: relative;
    padding-left: 26px;
    counter-reset: step;
    counter-increment: step 0;
  }

  :deep(.line::before) {
    content: counter(step);
    counter-increment: step;
    position: absolute;
    left: 0;
    width: 18px;
    display: inline-block;
    text-align: right;
    color: #34819b;
  }

  // If the container is too narrow, hide line numbers
  @container (width < 15em) {
    :deep(pre) {
      padding-left: 0;
    }
    :deep(.line::before) {
      content: none;
    }
  }
}

.addition,
.deletion {
  :deep(> pre) {
    position: relative;
    padding-left: 24px;
    // Disable default background and show background from parent (addition/deletion)
    background-color: transparent !important;
  }
  :deep(.line::before) {
    position: absolute;
    left: 8px;
    width: 1em;
    display: inline-block;
  }
}

.addition {
  background: var(--ui-color-green-100);
  :deep(code .line::before) {
    content: '+';
  }
}

.deletion {
  background: var(--ui-color-red-100);
  :deep(code .line::before) {
    content: '-';
  }
}
</style>
