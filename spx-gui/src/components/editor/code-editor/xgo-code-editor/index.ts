/**
 * @desc Public API entry point for xgo-code-editor module.
 */

export * from './project'
export * from './code-editor'
export * from './common'
export * from './context'
export * from './document-base'
export * as xgoDefinitions from './document-base/xgo'
export * from './lsp/types'
export * from './monaco'
export * from './text-document'

export * from './api-reference'
export * from './completion'
export * from './context-menu'
export * from './diagnostics'
export * from './hover'
export * from './inlay-hint'
export * from './input-helper'
export * from './resource'
export * from './snippet-variables'

// Vue components
export { default as CodeEditorUI, useCodeEditorUICtx } from './ui/CodeEditorUI.vue'
export { default as CodeEditorCard } from './ui/CodeEditorCard.vue'
export { default as ResourceInput } from './ui/input-helper/ResourceInput.vue'

export type { CodeEditorUIController } from './ui/code-editor-ui'
