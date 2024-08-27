<script lang="ts">
import type MarkdownIt from 'markdown-it'
export function preWrapperPlugin(md: MarkdownIt) {
  const fence = md.renderer.rules.fence!
  md.renderer.rules.fence = (...args) => {
    return `<div class="markdown-preview__wrapper"><button class="markdown-preview__copy-button"></button>${fence(...args)}</div>`
  }
}

async function copyToClipboard(text: string) {
  try {
    return navigator.clipboard.writeText(text)
  } catch {
    const element = document.createElement('textarea')
    const previouslyFocusedElement = document.activeElement

    element.value = text

    // Prevent keyboard from showing on mobile
    element.setAttribute('readonly', '')

    element.style.contain = 'strict'
    element.style.position = 'absolute'
    element.style.left = '-9999px'
    element.style.fontSize = '12pt' // Prevent zooming on iOS

    const selection = document.getSelection()
    const originalRange = selection ? selection.rangeCount > 0 && selection.getRangeAt(0) : null

    document.body.appendChild(element)
    element.select()

    // Explicit selection workaround for iOS
    element.selectionStart = 0
    element.selectionEnd = text.length

    document.execCommand('copy')
    document.body.removeChild(element)

    if (originalRange) {
      selection!.removeAllRanges() // originalRange can't be truthy when selection is falsy
      selection!.addRange(originalRange)
    }

    // Get the focus back on the previously focused element, if any
    if (previouslyFocusedElement) {
      ;(previouslyFocusedElement as HTMLElement).focus()
    }
  }
}

const timeoutIdMap: WeakMap<HTMLElement, number> = new WeakMap()
window.addEventListener('click', (e) => {
  const el = e.target as HTMLElement
  if (!el.matches('.markdown-preview__wrapper > .markdown-preview__copy-button')) return
  const parent = el.parentElement
  const sibling = el.nextElementSibling
  if (!parent || !sibling) return
  const clone = sibling.cloneNode(true) as HTMLElement
  const text = clone.textContent || ''
  copyToClipboard(text).then(() => {
    el.classList.add('copied')
    clearTimeout(timeoutIdMap.get(el))
    const timeoutId = setTimeout(() => {
      el.classList.remove('copied')
      el.blur()
      timeoutIdMap.delete(el)
    }, 2000)
    timeoutIdMap.set(el, timeoutId as unknown as number)
  })
})
</script>
<script setup lang="ts">
import { renderMarkdown } from './common/languages'
import CopyIcon from './icons/copy.svg'
import { computed } from 'vue'
import { useI18n } from '@/utils/i18n'
defineProps<{
  content: string
}>()
const i18n = useI18n()
const copyIcon = computed(() => `url('${CopyIcon}')`)
const copyMessage = computed(() => `'${i18n.t({ zh: '已复制', en: 'Copied' })}'`)
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <article class="markdown-preview" v-html="renderMarkdown(content)"></article>
</template>
<style lang="scss">
.markdown-preview {
  .shiki {
    padding: 8px;
    margin: 4px 0;
    // because in textMate theme it bg color is white,
    // however monaco editor use same textMate theme,
    // so here we have to use important to change markdown render bg color.
    background-color: rgba(229, 229, 229, 0.4) !important;
    border-radius: 5px;
    font-family: 'JetBrains Mono NL', Consolas, 'Courier New', monospace;
    line-height: 1.3;
  }
}

.markdown-preview__wrapper {
  position: relative;

  & .markdown-preview__copy-button {
    opacity: 0;
    transition: 0.15s;
  }
  &:hover .markdown-preview__copy-button {
    opacity: 1;
  }
}

.markdown-preview__copy-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  right: 8px;
  top: 6px;
  width: 22px;
  height: 22px;
  background-color: rgb(255, 255, 255);
  font-family: 'JetBrains Mono NL', Consolas, 'Courier New', 'AlibabaHealthB', monospace;
  border: none;
  outline: none;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;

  &:active {
    background-color: rgb(250, 250, 250);
  }

  &::after {
    content: v-bind(copyIcon);
    transform: translateY(1px);
  }

  &.copied::before {
    content: v-bind(copyMessage);
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    left: -4px;
    height: 100%;
    font-size: 12px;
    padding: 2px 4px;
    background-color: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transform: translateX(-100%);
    pointer-events: none;
    animation: MarkdownPreviewCopyButtonBounceOut 0.2s cubic-bezier(0.13, 1.24, 0.22, 1.16);
  }
}

@keyframes MarkdownPreviewCopyButtonBounceOut {
  from {
    transform: scale(0.4) translateX(-100%);
  }
}
</style>

<style scoped lang="scss">
// in most time, this component will render directly to the body element instead of #app element,
// so css variables is not available or make them deeper to :root,
// here need set them(color, font, etc.) manually
.markdown-preview {
  padding: 8px;
  font-size: 13px;
  font-family:
    AlibabaHealthB,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    'Noto Sans',
    sans-serif,
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Segoe UI Symbol',
    'Noto Color Emoji';
  line-height: 2;
}
</style>
