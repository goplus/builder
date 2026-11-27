import { computed } from 'vue'
import * as lsp from 'vscode-languageserver-protocol'
import type { Action } from '../../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import { CopilotExplainKind, builtInCommandCopilotExplain } from '../code-editor-ui'
import type { APIReferenceItem } from '.'

/** Derives the snippet preview and action list shared by browsing and search result items. */
export function useAPIReferenceItem(getItem: () => APIReferenceItem) {
  const codeEditorUICtx = useCodeEditorUICtx()

  const snippetPreview = computed(() => {
    const item = getItem()
    const parsed = codeEditorUICtx.ui.parseSnippet(item.insertSnippet)
    const overview = parsed.toString().replace(/{\n\s*\n}/g, '{}') // compress lambda expression
    const inlayHints: lsp.InlayHint[] = []
    ;(item.insertSnippetParameterHints ?? []).forEach((label, i) => {
      const placeholder = parsed.placeholders[i]
      const offset = parsed.offset(placeholder)
      inlayHints.push({
        label,
        position: { line: 0, character: offset },
        kind: lsp.InlayHintKind.Parameter
      })
    })
    const inlayHintsStr = JSON.stringify(inlayHints)
    return { overview, inlayHints: inlayHintsStr }
  })

  const actions = computed<Action[]>(() => {
    const item = getItem()
    return [
      {
        command: builtInCommandCopilotExplain,
        arguments: [
          {
            kind: CopilotExplainKind.Definition,
            overview: item.overview,
            definition: item.definition
          }
        ]
      }
    ]
  })

  return { snippetPreview, actions }
}
