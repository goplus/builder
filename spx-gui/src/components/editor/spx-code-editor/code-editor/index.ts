import * as monaco from 'monaco-editor'
import CodeEditor from './CodeEditor.vue'

import { editorOptions } from './editor'
export default CodeEditor

export interface Snippet extends monaco.languages.CompletionItem {}

export interface FormatError {
  Column: number
  Line: number
  Msg: string
}
export interface FormatResponse {
  Body: string
  Error: FormatError
}

export interface EditorOptions {
  minimap?: {
    enabled: boolean
  }
  readOnly?: boolean
  cursorStyle?: 'line' // line, block, 'line-thin', 'block-outline', 'underline', 'underline-thin'
}

export interface CodeEditorProps {
  modelValue: string
  height?: string
  width?: string
  editorOptions?: EditorOptions
}
export interface CodeEditorEmits {
  (e: 'change', value: string): void
  (e: 'update:modelValue', value: string): void
}
export * from './snippet'
export { monaco, editorOptions }
