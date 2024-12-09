import { createHighlighter } from 'shiki'
import gopLang from './gop-tm-language.json'
import defaultLightTheme from './default-light-theme.json'

// Use `transparent` instead of `#ffffff` to fit specific background color, e.g., `APIReferenceItem` hovered
defaultLightTheme.colors['editor.background'] = 'transparent'

export const tabSize = 4
export const theme = defaultLightTheme.name

let highlighterPromise: ReturnType<typeof createHighlighter> | null = null

export function getHighlighter() {
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
