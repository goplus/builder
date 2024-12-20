import { createHighlighter } from 'shiki'
import gopLang from './gop-tm-language.json'
import defaultLightTheme from './default-light-theme.json'

// Use `transparent` instead of `#ffffff` to fit specific background color, e.g., `APIReferenceItem` hovered
defaultLightTheme.colors['editor.background'] = 'transparent'

/** Size of a tab in spaces. */
export const tabSize = 4
/** Prefer spaces over tabs. */
export const insertSpaces = false
export const theme = defaultLightTheme.name

export type Highlighter = Awaited<ReturnType<typeof createHighlighter>>

let highlighterPromise: Promise<Highlighter> | null = null

export function getHighlighter(): Promise<Highlighter> {
  if (highlighterPromise == null) {
    highlighterPromise = createHighlighter({
      langs: [gopLang as any],
      langAlias: {
        gop: 'GoPlus',
        spx: 'gop'
      },
      themes: [defaultLightTheme as any]
    })
  }
  return highlighterPromise
}
