/**
 * LSP tracing utilities for consistent naming and identification across the application.
 */

const IDENTIFIER = 'LSP'

export type LSPTraceOptions = {
  /** Optional command name for better tracing context */
  command?: string
}

/**
 * Creates a standardized LSP operation name for tracing.
 * @param method LSP method name
 * @param options Optional tracing options
 * @returns Formatted operation name
 */
export function createLSPOperationName(method: string, options?: LSPTraceOptions): string {
  return options?.command ? `${IDENTIFIER}: ${method} (${options.command})` : `LSP: ${method}`
}

/**
 * Checks if a trace name is related to LSP operations.
 * @param name Trace/span name
 * @returns True if the name indicates an LSP operation
 */
export function isLSPOperation(name: string): boolean {
  return name.includes(IDENTIFIER)
}

