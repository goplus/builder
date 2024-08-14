import * as IMonaco from 'monaco-editor'
import { shikiToMonaco } from '@shikijs/monaco'
import { createHighlighter, type LanguageInput, type ThemeInput } from 'shiki'
import GOTextmate from './go.tmLanguage.json' // this is sample using, need keep it now.
import GOPTextmate from './gop.tmLanguage.json'
import SpxLightTheme from './spx-light.json'
import markdownit from 'markdown-it'

const highlighter = await createHighlighter({
  themes: [
    // the same reason as lang property...
    SpxLightTheme as unknown as ThemeInput
  ],
  langs: [
    // because shiki `LanguageInput` interface need textmate grammar file include property `$self` and `$base`
    // `$base` or `$self` mean current language grammar root, exhibiting an effect similar to the for loop label syntax.
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
})

export async function injectMonacoHighlightTheme(monaco: typeof IMonaco) {
  shikiToMonaco(highlighter, monaco)
}

const md = markdownit({
  highlight: function (str, lang): string {
    if (lang && highlighter.getLanguage(lang)) {
      try {
        return getLanguageHighlightHtml(str)
      } catch (e) {
        console.warn(e)
      }
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
  }
})

function getLanguageHighlightHtml(code: string) {
  return highlighter.codeToHtml(code, {
    lang: 'gop',
    theme: 'spx-light'
  })
}

export function renderMarkdown(content: string) {
  return md.render(content)
}
