/**
 * @desc Public API entry point for spx-code-editor module.
 * Re-exports all public APIs from xgo-code-editor, plus spx-specific additions.
 */

// Re-export everything from the generic xgo-code-editor layer
export * from '@/components/xgo-code-editor'

// Spx-specific common types (ColorValue, SpxInputTypedValue, SpxInputSlotAccept,
// and the merged InputTypedValue / InputSlotAccept)
export * from './common'

// Spx project adapter
export * from './spx-project'

// Spx code owners
export * from './text-document'

// Spx LSP client
export { SpxLSPClient } from './lsp/spx-lsp-client'

// Spx-specific providers
export * from './api-reference'
export * from './diagnostics'
export * from './input-helper'
export * from './resource'

// Vue components
export { default as CodeEditorProvider } from './CodeEditorProvider.vue'
export { default as CodeLink } from './CodeLink.vue'
export { default as FormatButton } from './FormatButton.vue'
