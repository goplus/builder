import { createHighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'
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
        xgo: 'GoPlus',
        gop: 'xgo',
        spx: 'xgo'
      },
      themes: [defaultLightTheme as any],
      // Use Oniguruma to avoid Safari RegExp compatibility issues that leave Monaco
      // syntax colors missing and API Reference snippets blank (goplus/builder#3679).
      engine: createOnigurumaEngine(import('shiki/wasm'))
    })
  }
  return highlighterPromise
}
