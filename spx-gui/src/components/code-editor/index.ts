/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-30 16:26:20
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-04 13:15:49
 * @FilePath: /spx-gui/src/components/code-editor/index.ts
 * @Description:
 */
import * as monaco from 'monaco-editor'
import CodeEditor from './CodeEditor.vue'

import { register } from './register'
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
export { monaco, register, editorOptions }
