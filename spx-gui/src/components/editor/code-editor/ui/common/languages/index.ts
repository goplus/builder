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
import markdownit from 'markdown-it'

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

const md = markdownit({
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

export async function injectMonacoHighlightTheme(monaco: typeof IMonaco) {
  shikiToMonaco(await highlighterPromise, monaco)
}

export function renderMarkdown(content: string) {
  return md.render(content)
}
