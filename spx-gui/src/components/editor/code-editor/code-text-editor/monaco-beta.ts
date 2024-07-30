// this is temp file will merge into monaco.ts after type error is totally resolved
// the following code may use `any` type or `force transformed` type because some type is not exported,
// whole type need from monaco-editor repo to generate new type definition
// todo: generate monaco.all.ts type from https://github.com/microsoft/vscode

import type { editor } from 'monaco-editor'
import type { UnwrapNestedRefs } from 'vue'
import type { CompletionMenuItem, MonacoCompletionModelItem } from './tools/completion'

import { IconEnum } from '@/components/editor/code-editor/code-text-editor/tools'
import { languages } from 'monaco-editor'
import CompletionItemKind = languages.CompletionItemKind
import { createMatches } from '@/components/editor/code-editor/code-text-editor/tools/monaco-editor-core'

export interface CompletionMenuState {
  visible: boolean
  suggestions: CompletionMenuItem[]
  activeIdx: number
  position: {
    top: number
    left: number
  }
}

export function upgradeCompletionMenu(
  monaco: editor.IStandaloneCodeEditor,
  completionMenuState: UnwrapNestedRefs<CompletionMenuState>,
  events: Partial<{
    onShow: () => void
    onHide: () => void
    onFocus: () => void
    onSelect: () => void
  }> = {}
): {
  dispose: () => void
  select: (idx: number) => void
} {
  const suggestController: any = monaco.getContribution('editor.contrib.suggestController')
  if (!suggestController) throw new Error(`can't find suggestController`)

  const widget = suggestController.widget.value
  const completionModelItems2CompletionItems = (
    completionModelItems: MonacoCompletionModelItem[]
  ) => {
    return completionModelItems.map((completion) => {
      // todo: this is temp code, need to combine with hover preview.
      return {
        icon: completionItemKind2Icon(completion.completion.kind),
        label: completion.completion.label as string,
        preview: {
          content: ''
        },
        insertText: completion.completion.insertText,
        desc: completion.completion.detail || '',
        matches: createMatches(completion.score)
      } as CompletionMenuItem
    })
  }

  widget.onDidHide(() => {
    events.onHide?.()
    completionMenuState.visible = false
    completionMenuState.suggestions.length = 0
  })

  widget.onDidShow(() => {
    events.onShow?.()
    completionMenuState.visible = true
    const completionItems: MonacoCompletionModelItem[] = widget._completionModel.items
    completionMenuState.activeIdx = 0
    completionMenuState.suggestions = completionModelItems2CompletionItems(completionItems)
  })
  widget.onDidFocus(() => {
    events.onFocus?.()
    const focusedItem = widget.getFocusedItem()
    if (!focusedItem) return
    const completionItems: MonacoCompletionModelItem[] = widget._completionModel.items
    completionMenuState.activeIdx = focusedItem.index
    completionMenuState.suggestions = completionModelItems2CompletionItems(completionItems)
  })

  return {
    dispose: () => {
      // inner monaco editor will dispose suggestion widget when dispose editor
    },
    select(idx: number) {
      const completionItems: MonacoCompletionModelItem[] = widget._completionModel.items
      if (!completionItems.length || idx < 0 || idx >= completionItems.length) return
      widget._select(completionItems[idx], idx)
    }
  }
}

export function completionItemKind2Icon(completionIcon: CompletionItemKind): IconEnum {
  switch (completionIcon) {
    case languages.CompletionItemKind.Function:
      return IconEnum.Function
    case languages.CompletionItemKind.Variable:
      return IconEnum.Prototype
    case languages.CompletionItemKind.Constant:
      return IconEnum.Prototype
    case languages.CompletionItemKind.Snippet:
      return IconEnum.Function
    default:
      return IconEnum.Prototype
  }
}
