import type { Icon, LayerContent } from './common'
import type monaco from 'monaco-editor'
import type { FuzzyScore, IMatch } from './monaco-editor-core'

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

export interface CompletionMenuItem {
  icon: Icon
  label: string
  desc: string
  insertText: string
  preview: LayerContent
  matches: IMatch[]
}
