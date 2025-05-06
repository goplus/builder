import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import gopLang from './gop-tm-language.json'
import defaultLightTheme from './default-light-theme.json'

/** Size of a tab in spaces. */
export const tabSize = 4
/** Prefer spaces over tabs. */
export const insertSpaces = false
export const theme = defaultLightTheme.name

export type Highlighter = Awaited<ReturnType<typeof createHighlighterCore>>

let highlighterPromise: Promise<Highlighter> | null = null

export function getHighlighter(): Promise<Highlighter> {
  if (highlighterPromise == null) {
    highlighterPromise = createHighlighterCore({
      langs: [gopLang as any],
      langAlias: {
        gop: 'GoPlus',
        spx: 'gop'
      },
      themes: [defaultLightTheme as any],
      engine: createJavaScriptRegexEngine()
    })
  }
  return highlighterPromise
}
