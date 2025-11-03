import { shallowRef, watchEffect } from 'vue'
import * as lsp from 'vscode-languageserver-protocol'
import * as Sentry from '@sentry/vue'
import { Cancelled } from '@/utils/exception'
import { Disposable, getCleanupSignal, type Disposer } from '@/utils/disposable'
import { timeout, until, untilNotNull } from '@/utils/utils'
import { extname } from '@/utils/path'
import { createLSPOperationName, createLSPServerOperationName, type LSPTraceOptions } from '@/utils/tracing'
import type { Project } from '@/models/project'
import {
  fromLSPRange,
  type DefinitionIdentifier,
  type Position,
  type ResourceReference,
  type TextDocumentIdentifier,
  containsPosition,
  type InputSlot
} from '../common'
import { Spxlc, type IConnection, ResponseError } from './spxls/client'
import type { Files as SpxlsFiles, RequestMessage, ResponseMessage, NotificationMessage } from './spxls'
import { spxGetDefinitions, spxGetInputSlots, spxRenameResources } from './spxls/commands'
import {
  type CompletionItem,
  isDocumentLinkForResourceReference,
  parseDocumentLinkForDefinition
} from './spxls/methods'
import type { WorkerHandler } from './worker'

interface IConnectionWithFiles extends IConnection {
  sendFiles(files: SpxlsFiles): void
  dispose(): void
}

/** Connection between LS client and server when the server runs in a Web Worker. */
class WorkerConnection implements IConnectionWithFiles {
  private worker: WorkerHandler
  constructor() {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  }
  sendMessage(message: RequestMessage | NotificationMessage) {
    this.worker.postMessage({ type: 'lsp', message })
  }
  onMessage(handler: (message: ResponseMessage | NotificationMessage) => void) {
    this.worker.addEventListener('message', (event) => {
      const message = event.data
      handler(message.message)
    })
  }
  sendFiles(files: SpxlsFiles): void {
    this.worker.postMessage({ type: 'files', files })
  }
  dispose() {
    this.worker.terminate()
  }
}

type TraceOptions = {
  /** Optional command name for better tracing context */
  command?: string
}

// Enhanced method for LSP requests with Sentry tracing
async function tracedRequest<T>(
  method: string,
  operation: (span: Sentry.Span) => Promise<T>,
  options?: LSPTraceOptions
): Promise<T> {
  const opName = createLSPOperationName(method, options)
  // We construct an inactive span to avoid inrelevant child spans, e.g., concurrent HTTP requests.
  const span = Sentry.startInactiveSpan({
    name: opName,
    op: 'lsp.request',
    attributes: {
      'lsp.method': method,
      ...(options?.command ? { 'lsp.command': options.command } : {})
    }
  })
  return operation(span)
    .then(
      (result) => {
        span.setStatus({ code: 1 }) // OK
        return result
      },
      (error) => {
        span.setStatus({
          code: 2, // ERROR
          message: error instanceof Cancelled ? 'cancelled' : undefined
        })
        throw error
      }
    )
    .finally(() => {
      span.end()
    })
}

export type RequestContext = {
  /** Optional signal to cancel the request */
  signal?: AbortSignal
  /** Optional tracing options for the request */
  traceOptions?: TraceOptions
}

type TelemetryEventBaseParams = {
  initTimestamp: number
  startTimestamp: number
  endTimestamp: number
  success: boolean
}

type TelemetryEventParamsForCall = TelemetryEventBaseParams & {
  call: RequestMessage
}

type TelemetryEventParamsForNotification = TelemetryEventBaseParams & {
  notification: NotificationMessage
}

type TelemetryEventParams = TelemetryEventParamsForCall | TelemetryEventParamsForNotification

export class SpxLSPClient extends Disposable {
  constructor(private project: Project) {
    super()
  }

  private connection: IConnectionWithFiles | undefined
  private isFilesStale = shallowRef(true)

  async loadFiles(signal: AbortSignal) {
    this.isFilesStale.value = true
    const files = this.project.exportGameFiles()
    const loadedFiles: SpxlsFiles = {}
    await Promise.all(
      Object.entries(files).map(async ([path, file]) => {
        if (file == null) return
        const ext = extname(path)
        if (['.spx', '.json'].includes(ext)) {
          // Only `.spx` & `.json` files are needed for `spxls`
          const ab = await file.arrayBuffer(signal)
          loadedFiles[path] = {
            content: new Uint8Array(ab),
            modTime: file.lastModified
          }
        }
      })
    )
    signal.throwIfAborted()
    this.connection?.sendFiles(loadedFiles)
    this.isFilesStale.value = false
  }

  private spxlcRef = shallowRef<Spxlc | null>(null)
  private activeSpans = new Map<number, Sentry.Span>()

  private async prepareRequest() {
    const [spxlc] = await Promise.all([
      untilNotNull(this.spxlcRef),
      // Typically requests are triggered earlier than file-loading:
      // * file-loading: editor-event -> model-update -> file-loading
      // * request: editor-event -> request
      // Here we add `timeout(0)` to ensure that file-loading triggered before request really starts.
      timeout(0).then(() => until(() => !this.isFilesStale.value))
    ])
    return spxlc
  }

  init() {
    this.connection = new WorkerConnection()
    this.addDisposer(watchEffect((cleanUp) => this.loadFiles(getCleanupSignal(cleanUp))))
    this.spxlcRef.value = new Spxlc(this.connection)

    // Register handler for telemetry event notifications
    this.spxlcRef.value.onNotification(lsp.TelemetryEventNotification.method, (params) => {
      this.handleTelemetryEventNotification(params)
    })
  }

  dispose() {
    this.spxlcRef.value?.dispose()
    this.connection?.dispose()
    super.dispose()
  }

  /** Do LSP request, with cancellation and tracing. */
  private async request<T>({ signal, traceOptions }: RequestContext, method: string, params: any): Promise<T> {
    const spxlc = await this.prepareRequest()
    return tracedRequest(
      method,
      async (span: Sentry.Span) => {
        let unlisten: Disposer | undefined
        const ongoingReq = spxlc.request<T>(method, params)

        // Store the span immediately when request is created
        const requestId = ongoingReq.id
        this.activeSpans.set(requestId, span)

        if (signal != null) {
          const cancel = () => this.cancelRequest(ongoingReq.id)
          if (signal.aborted) {
            cancel()
          } else {
            signal.addEventListener('abort', cancel)
            unlisten = () => signal.removeEventListener('abort', cancel)
          }
        }
        return ongoingReq
          .response()
          .catch((e) => {
            if (e instanceof ResponseError && e.code === lsp.LSPErrorCodes.RequestCancelled) {
              throw new Cancelled(e.message)
            }
            console.warn(`[LSP] ${method} error:`, e, ', params:', params)
            throw e
          })
          .finally(unlisten)
      },
      traceOptions
    )
  }

  private async cancelRequest(id: number) {
    const spxlc = await untilNotNull(this.spxlcRef)
    // The method `$/cancelRequest` is defined in https://github.com/microsoft/vscode-languageserver-node/blob/4c20197acf4c499345a18e79945e706345cbc50f/protocol/src/common/protocol.%24.ts#L46-L58 ,
    // while not exported by package `vscode-languageserver-protocol`.
    spxlc.notify('$/cancelRequest', { id })
  }

  private async executeCommand<A extends any[], R>(ctx: RequestContext, command: string, ...args: A): Promise<R> {
    return this.request<R>({ ...ctx, traceOptions: { command } }, lsp.ExecuteCommandRequest.method, {
      command,
      arguments: args
    })
  }

  async workspaceExecuteCommandSpxGetDefinitions(
    ctx: RequestContext,
    ...params: spxGetDefinitions.Arguments
  ): Promise<spxGetDefinitions.Result> {
    return this.executeCommand<spxGetDefinitions.Arguments, spxGetDefinitions.Result>(
      ctx,
      spxGetDefinitions.command,
      ...params
    )
  }

  async workspaceExecuteCommandSpxRenameResources(
    ctx: RequestContext,
    ...params: spxRenameResources.Arguments
  ): Promise<spxRenameResources.Result> {
    return this.executeCommand<spxRenameResources.Arguments, spxRenameResources.Result>(
      ctx,
      spxRenameResources.command,
      ...params
    )
  }

  async workspaceExecuteCommandSpxGetInputSlots(
    ctx: RequestContext,
    ...params: spxGetInputSlots.Arguments
  ): Promise<spxGetInputSlots.Result> {
    return this.executeCommand<spxGetInputSlots.Arguments, spxGetInputSlots.Result>(
      ctx,
      spxGetInputSlots.command,
      ...params
    )
  }

  async textDocumentDocumentLink(
    ctx: RequestContext,
    params: lsp.DocumentLinkParams
  ): Promise<lsp.DocumentLink[] | null> {
    return this.request<lsp.DocumentLink[] | null>(ctx, lsp.DocumentLinkRequest.method, params)
  }

  async textDocumentDiagnostic(
    ctx: RequestContext,
    params: lsp.DocumentDiagnosticParams
  ): Promise<lsp.DocumentDiagnosticReport> {
    return this.request<lsp.DocumentDiagnosticReport>(ctx, lsp.DocumentDiagnosticRequest.method, params)
  }

  async workspaceDiagnostic(
    ctx: RequestContext,
    params: lsp.WorkspaceDiagnosticParams
  ): Promise<lsp.WorkspaceDiagnosticReport> {
    return this.request<lsp.WorkspaceDiagnosticReport>(ctx, lsp.WorkspaceDiagnosticRequest.method, params)
  }

  async textDocumentHover(ctx: RequestContext, params: lsp.HoverParams): Promise<lsp.Hover | null> {
    return this.request<lsp.Hover | null>(ctx, lsp.HoverRequest.method, params)
  }

  async textDocumentCompletion(
    ctx: RequestContext,
    params: lsp.CompletionParams
  ): Promise<lsp.CompletionList | lsp.CompletionItem[] | null> {
    return this.request<lsp.CompletionList | lsp.CompletionItem[] | null>(ctx, lsp.CompletionRequest.method, params)
  }

  async textDocumentDefinition(ctx: RequestContext, params: lsp.DefinitionParams): Promise<lsp.Definition | null> {
    return this.request<lsp.Definition | null>(ctx, lsp.DefinitionRequest.method, params)
  }

  async textDocumentTypeDefinition(
    ctx: RequestContext,
    params: lsp.TypeDefinitionParams
  ): Promise<lsp.Definition | null> {
    return this.request<lsp.Definition | null>(ctx, lsp.TypeDefinitionRequest.method, params)
  }

  async textDocumentPrepareRename(
    ctx: RequestContext,
    params: lsp.PrepareRenameParams
  ): Promise<lsp.PrepareRenameResult | null> {
    return this.request<lsp.PrepareRenameResult | null>(ctx, lsp.PrepareRenameRequest.method, params)
  }

  async textDocumentRename(ctx: RequestContext, params: lsp.RenameParams): Promise<lsp.WorkspaceEdit | null> {
    return this.request<lsp.WorkspaceEdit | null>(ctx, lsp.RenameRequest.method, params)
  }

  async textDocumentFormatting(
    ctx: RequestContext,
    params: lsp.DocumentFormattingParams
  ): Promise<lsp.TextEdit[] | null> {
    return this.request<lsp.TextEdit[] | null>(ctx, lsp.DocumentFormattingRequest.method, params)
  }

  async textDocumentInlayHint(ctx: RequestContext, params: lsp.InlayHintParams): Promise<lsp.InlayHint[] | null> {
    return this.request<lsp.InlayHint[] | null>(ctx, lsp.InlayHintRequest.method, params)
  }

  /**
   * Handles performance notifications from the WASM language server
   */
  handleTelemetryEventNotification(params: TelemetryEventParams): void {
    const { initTimestamp, startTimestamp, endTimestamp, success } = params

    // Drop telemetry events for notifications temporarily. TODO: report them properly
    if (!('call' in params)) return

    const call = params.call
    const id = call.id
    const method = call.method

    let command: string | undefined
    if (
      method === lsp.ExecuteCommandRequest.method &&
      call.params &&
      typeof call.params === 'object' &&
      'command' in call.params
    ) {
      command = call.params.command as string | undefined
    }

    const parentSpan = this.activeSpans.get(id)

    if (!parentSpan) {
      console.warn(`[LSP] No active span found for request ID: ${id}`)
      return
    }
    this.activeSpans.delete(id)
    const opName = createLSPServerOperationName(method, { command })

    // Create a child span for WASM execution
    const span = Sentry.startInactiveSpan({
      name: opName,
      op: 'lsp.server.execution',
      attributes: {
        'lsp.method': method,
        queue_time_ms: startTimestamp - initTimestamp,
        duration_ms: endTimestamp - startTimestamp,
        success: success,
        ...(command ? { 'lsp.command': command } : {})
      },
      startTime: startTimestamp,
      parentSpan
    })
    // `parentSpanIsAlwaysRootSpan` is set to `true` by default in browser, the parent span we passed to
    // `Sentry.startInactiveSpan` is not used, see details in https://github.com/getsentry/sentry-javascript/issues/16769 .
    // As a workaround, here we set the `_parentSpanId` property manually to ensure that the parent span is correctly linked in Sentry.
    // TODO: remove this workaround when new version of Sentry is released with this issue fixed.
    ;(span as any)._parentSpanId = parentSpan.spanContext().spanId
    span.end(endTimestamp)
  }

  // Higher-level APIs

  async getResourceReferences(ctx: RequestContext, textDocument: TextDocumentIdentifier): Promise<ResourceReference[]> {
    const documentLinks = await this.textDocumentDocumentLink(ctx, { textDocument })
    if (documentLinks == null) return []
    const rrs: ResourceReference[] = []
    for (const documentLink of documentLinks) {
      if (!isDocumentLinkForResourceReference(documentLink)) continue
      rrs.push({
        kind: documentLink.data.kind,
        range: fromLSPRange(documentLink.range),
        resource: { uri: documentLink.target }
      })
    }
    return rrs
  }

  async getDefinition(
    ctx: RequestContext,
    textDocument: TextDocumentIdentifier,
    position: Position
  ): Promise<DefinitionIdentifier | null> {
    const documentLinks = await this.textDocumentDocumentLink(ctx, { textDocument })
    if (documentLinks == null) return null
    for (const documentLink of documentLinks) {
      const definition = parseDocumentLinkForDefinition(documentLink)
      if (definition == null) continue
      const range = fromLSPRange(documentLink.range)
      if (!containsPosition(range, position)) continue
      return definition
    }
    return null
  }

  async getCompletionItems(ctx: RequestContext, params: lsp.CompletionParams) {
    const completionResult = await this.textDocumentCompletion(ctx, params)
    if (completionResult == null) return []
    if (!Array.isArray(completionResult)) return [] // For now, we support CompletionItem[] only
    return completionResult as CompletionItem[]
  }

  async getInputSlots(ctx: RequestContext, textDocument: TextDocumentIdentifier): Promise<InputSlot[]> {
    const result = await this.workspaceExecuteCommandSpxGetInputSlots(ctx, { textDocument })
    if (result == null) return []
    return result.map((item) => ({
      ...item,
      range: fromLSPRange(item.range)
    }))
  }
}
