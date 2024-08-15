import type monaco from 'monaco-editor'
import type { FuzzyScore, IMatch } from '../../common/monaco-editor-core'
import type { Icon } from 'src/components/editor/code-editor/ui/common'
import type { LayerContent } from '@/components/editor/code-editor/EditorUI'

export interface MonacoCompletionItem extends monaco.languages.CompletionItem {}

/**
 * attention! this is not full types form monaco editor, but only the necessary for completion used!
 */
export interface MonacoCompletionModelItem {
  completion: MonacoCompletionItem
  position: monaco.Position
  container: {
    suggestions: MonacoCompletionItem[]
  }
  distance: number
  idx: number
  word: string
  textLabel: string
  sortTextLow: string
  labelLow: string
  score: FuzzyScore
}

// this interface like `EditorUI.ts` interface CompletionItem, but add more property `matches` which can highlight completion menu item from monaco inner function
export interface CompletionMenuFeatureItem {
  icon: Icon
  label: string
  desc: string
  insertText: string
  preview: LayerContent
  matches: IMatch[]
}
