import * as IMonaco from 'monaco-editor'
import { shikiToMonaco } from '@shikijs/monaco'
import {
  type BundledLanguage,
  type BundledTheme,
  createHighlighter,
  type HighlighterGeneric,
  type LanguageInput,
  type ThemeInput
} from 'shiki'
import GOTextmate from './go.tmLanguage.json' // this is sample using, need keep it now.
import GOPTextmate from './gop.tmLanguage.json'
import SpxLightTheme from './spx-light.json'
import markdownIt from 'markdown-it'
import type MarkdownIt from 'markdown-it'

let highlighter: HighlighterGeneric<BundledLanguage, BundledTheme> | null = null
const highlighterPromise = createHighlighter({
  themes: [
    // the same reason as `lang` property...
    SpxLightTheme as unknown as ThemeInput
  ],
  langs: [
    // because shiki `LanguageInput` interface need textmate grammar file include property `$self` and `$base`
    // `$base` or `$self` mean current language grammar match root, similar to the for loop label syntax.
    // current file doesn't have this property, but still working well and no effect, so here use force transformed type
    GOTextmate as unknown as LanguageInput,
    GOPTextmate as unknown as LanguageInput
  ],
  langAlias: {
    // need keep this line for sample diff
    go: 'Go',
    gop: 'Gop',
    spx: 'Gop',
    'go+': 'Gop'
  }
}).then((_highlighter) => (highlighter = _highlighter))

const md = markdownIt({
  highlight: function (str, lang): string {
    if (highlighter && lang && highlighter.getLanguage(lang)) {
      return highlighter.codeToHtml(str, {
        lang,
        theme: 'spx-light'
      })
    } else {
      return '<pre class="shiki"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
    }
  }
})

md.use(preWrapperPlugin)

export async function injectMonacoHighlightTheme(monaco: typeof IMonaco) {
  shikiToMonaco(await highlighterPromise, monaco)
}

export function renderMarkdown(content: string) {
  return md.render(content)
}

function preWrapperPlugin(md: MarkdownIt) {
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
