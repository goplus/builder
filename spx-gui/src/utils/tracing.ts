/**
 * Tracing utilities.
 */

import * as SentryCore from '@sentry/core'

const LSP_IDENTIFIER = 'LSP'

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
  return options?.command ? `${LSP_IDENTIFIER}: ${method} (${options.command})` : `${LSP_IDENTIFIER}: ${method}`
}

export function createLSPServerOperationName(method: string, options?: LSPTraceOptions): string {
  return options?.command
    ? `${LSP_IDENTIFIER} Server: ${method} (${options.command})`
    : `${LSP_IDENTIFIER} Server: ${method}`
}

/**
 * Checks if a trace name is related to LSP operations.
 * @param name Trace/span name
 * @returns True if the name indicates an LSP operation
 */
export function isLSPOperation(name: string): boolean {
  return name.startsWith(LSP_IDENTIFIER)
}

const CODE_EDITOR_IDENTIFIER = 'CodeEditor'

export function createCodeEditorOperationName(desc: string) {
  return `${CODE_EDITOR_IDENTIFIER}: ${desc}`
}

export function isCodeEditorOperation(name: string): boolean {
  return name.startsWith(CODE_EDITOR_IDENTIFIER)
}

type IdleSpanOptions = NonNullable<Parameters<typeof SentryCore.startIdleSpan>[1]>

/**
 * `defineIdleTransaction` defines a type of (Sentry) idle transaction that can be used to group spans.
 * Idle transactions are transactions that automatically finish after a certain time of inactivity.
 * A start function is returned that can be used to start a new idle transaction of given type.
 */
export function defineIdleTransaction({
  startSpanOptions,
  idleSpanOptions = {},
  mergeAdjacent = false
}: {
  startSpanOptions: SentryCore.StartSpanOptions
  idleSpanOptions?: IdleSpanOptions
  mergeAdjacent?: boolean
}) {
  let prevSpan: SentryCore.Span | null = null
  return function start() {
    if (mergeAdjacent && prevSpan != null && prevSpan.isRecording()) return prevSpan

    // Transactions are always root spans, so we end the previous root span if it exists.
    const activeSpan = SentryCore.getActiveSpan()
    const rootSpan = activeSpan != null ? SentryCore.getRootSpan(activeSpan) : null
    if (rootSpan != null) rootSpan.end()

    prevSpan = SentryCore.startIdleSpan(startSpanOptions, {
      idleTimeout: 300,
      ...idleSpanOptions
    })
    return prevSpan
  }
}
