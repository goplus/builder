/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-30 16:26:20
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-31 16:16:05
 * @FilePath: /builder/spx-gui/src/components/code-editor/CodeEditor.ts
 * @Description: 
 */
import * as monaco from 'monaco-editor'
import CodeEditor from "./CodeEditor.vue"

import { register } from './register';
import { editorOptions } from "./Language"
export default CodeEditor;


export interface EditorOptions {
    minimap?: {
        enabled: boolean
    }
    readOnly?: boolean
    cursorStyle?: "line" // line, block, 'line-thin', 'block-outline', 'underline', 'underline-thin'
}

export interface CodeEditorProps {
    modelValue: string
    height: string
    width: string
    editorOptions?: EditorOptions
}
export interface CodeEditorEmits {
    (e: 'change', value: string): void
    (e: 'update:modelValue', value: string): void
}
export * from "./Snippet"
export {
    monaco,
    register,
    editorOptions,
}