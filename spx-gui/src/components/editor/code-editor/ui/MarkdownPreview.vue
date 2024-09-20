<script lang="ts">
import type MarkdownIt from 'markdown-it'
export function preWrapperPlugin(md: MarkdownIt) {
  const fence = md.renderer.rules.fence!
  md.renderer.rules.fence = (tokens, currentTokenIndex, ...args) => {
    const token = tokens[currentTokenIndex]
    const [language, ...languageParams] = token.info.split(' ')
    if (languageParams.includes('pure')) {
      // here only one token so index is 0
      let renderedCode = fence([token], 0, ...args)

      renderedCode = renderedCode.replace(/<pre[^>]*>([\s\S]*)<\/pre>/i, '$1').trim()

      return renderedCode
    }

    return `<div class="markdown-preview__wrapper"><button class="markdown-preview__copy-button"></button>${fence(tokens, currentTokenIndex, ...args)}</div>`
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
$markdown-code-font-family: 'JetBrains Mono NL', Consolas, 'Courier New', 'AlibabaHealthB',
  monospace;

.markdown-preview {
  .shiki {
    overflow: auto;
    padding: 8px;
    margin: 4px 0;
    // because in textMate theme it bg color is white,
    // however monaco editor use same textMate theme,
    // so here we have to use important to change markdown render bg color.
    background-color: rgba(229, 229, 229, 0.4) !important;
    border-radius: 5px;
    font-family: $markdown-code-font-family;
    code {
      padding: initial;
      border-radius: initial;
      background-color: initial;
      font-family: $markdown-code-font-family;
    }
  }

  code {
    padding: 0.1em 0.4em;
    background-color: rgba(229, 229, 229, 0.4);
    border-radius: 3px;
    font-family: $markdown-code-font-family;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    padding-bottom: 0.3em;
    font-weight: 600;
    line-height: 1.25;
  }

  h1 {
    font-size: 2em;
  }
  h2 {
    font-size: 1.5em;
  }
  h3 {
    font-size: 1.25em;
  }
  h4 {
    font-size: 1em;
  }
  h5 {
    font-size: 0.875em;
  }
  h6 {
    font-size: 0.85em;
  }

  p {
    margin-top: 0;
    margin-bottom: 0.5em;
  }

  a {
    color: #0366d6;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  ul,
  ol {
    padding-left: 2em;
    margin-top: 0;
    margin-bottom: 16px;
  }

  li {
    margin-bottom: 0.25em;
  }

  blockquote {
    padding: 0 1em;
    color: #6a737d;
    border-left: 0.25em solid #dfe2e5;
    margin: 0 0 16px 0;
  }

  pre {
    padding: 16px;
    overflow: auto;
    line-height: 1.45;
    background-color: #f6f8fa;
    border-radius: 3px;
  }

  img {
    max-width: 100%;
    box-sizing: content-box;
  }

  hr {
    height: 0.25em;
    padding: 0;
    margin: 24px 0;
    background-color: #e1e4e8;
    border: 0;
  }

  table {
    border-spacing: 0;
    border-collapse: collapse;
    margin-bottom: 16px;
  }

  td,
  th {
    padding: 6px 13px;
    border: 1px solid #dfe2e5;
  }

  th {
    font-weight: 600;
  }

  tr {
    background-color: #fff;
    border-top: 1px solid #c6cbd1;
  }

  tr:nth-child(2n) {
    background-color: #f6f8fa;
  }

  & > *:first-child {
    margin-top: 0;
  }

  & > *:last-child {
    margin-bottom: 0;
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
  font-family: $markdown-code-font-family;
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
  font-family: $markdown-code-font-family;
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

  &.detail {
    color: black;
    line-height: 1.3;
  }
}
</style>
