import { shallowRef, watchEffect } from 'vue'
import * as lsp from 'vscode-languageserver-protocol'
import * as Sentry from '@sentry/browser'
import { Disposable, getCleanupSignal } from '@/utils/disposable'
import { timeout, until, untilNotNull } from '@/utils/utils'
import { extname } from '@/utils/path'
import { toText } from '@/models/common/file'
import type { Project } from '@/models/project'
import wasmExecScriptUrl from '@/assets/wasm/wasm_exec.js?url'
import spxlsWasmUrl from '@/assets/wasm/spxls.wasm?url'
import spxlsPkgdataZipUrl from '@/assets/wasm/spxls-pkgdata.zip?url'
import {
  fromLSPRange,
  type DefinitionIdentifier,
  type Position,
  type ResourceReference,
  type TextDocumentIdentifier,
  containsPosition,
  type InputSlot
} from '../common'
import { Spxlc } from './spxls/client'
import type { Files as SpxlsFiles } from './spxls'
import { spxGetDefinitions, spxGetInputSlots, spxRenameResources } from './spxls/commands'
import {
  type CompletionItem,
  isDocumentLinkForResourceReference,
  parseDocumentLinkForDefinition
} from './spxls/methods'

function loadScript(url: string) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.onload = resolve
    script.onerror = reject
    document.body.appendChild(script)
  })
}

// 10 seconds cooldown between language server restarts.
const LS_RESTART_COOLDOWN = 10_000

// Enhanced method for LSP requests with Sentry tracing
async function tracedRequest<T>(method: string, operation: () => Promise<T>): Promise<T> {
  return Sentry.startSpan(
    {
      name: `LSP: ${method}`,
      op: 'lsp.request',
      attributes: {
        'lsp.method': method
      }
    },
    async (span) => {
      const startTime = performance.now()

      try {
        const result = await operation()

        // Record performance metrics
        const duration = performance.now() - startTime
        span.setAttribute('duration_ms', Math.round(duration))
        span.setAttribute('duration_category', duration > 500 ? 'very_slow' : duration > 100 ? 'slow' : 'normal')
        span.setAttribute('success', true)

        return result
      } catch (error) {
        // Record error information
        span.setAttribute('success', false)
        span.setAttribute('error', String(error))

        // Re-throw to maintain original behavior
        throw error
      }
    }
  )
}

export class SpxLSPClient extends Disposable {
  constructor(private project: Project) {
    super()
  }

  private files: SpxlsFiles = {}
  private isFilesStale = shallowRef(true)

  async loadFiles(signal: AbortSignal) {
    this.isFilesStale.value = true
    const files = this.project.exportGameFiles()
    const debugFiles: Record<string, string> = {}
    const loadedFiles: SpxlsFiles = {}
    await Promise.all(
      Object.entries(files).map(async ([path, file]) => {
        if (file == null) return
        const ext = extname(path)
        if (['.spx', '.json'].includes(ext)) {
          // Only `.spx` & `.json` files are needed for `spxls`
          const ab = await file.arrayBuffer()
          loadedFiles[path] = {
            content: new Uint8Array(ab),
            modTime: this.project.modTime ?? Date.now()
          }
          debugFiles[path] = await toText(file)
        }
      })
    )
    signal.throwIfAborted()
    this.files = loadedFiles
    this.isFilesStale.value = false
  }

  private loadWasmScriptPromise: Promise<unknown> | null = null

  private async loadWasmScript() {
    return (this.loadWasmScriptPromise = this.loadWasmScriptPromise ?? loadScript(wasmExecScriptUrl))
  }

  private spxlcRef = shallowRef<Spxlc | null>(null)
  private isLSRunning = shallowRef(false)
  private isLSRestarting = false
  private lsRestartedAt = 0

  private async prepareRequest() {
    this.prepareLanguageServer()

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

  async init() {
    this.addDisposer(watchEffect((cleanUp) => this.loadFiles(getCleanupSignal(cleanUp))))
    await this.loadWasmScript()
    await this.prepareLanguageServer()
  }

  private async prepareLanguageServer() {
    if (this.isLSRunning.value || this.isLSRestarting) return
    this.isLSRestarting = true

    // Apply cooldown between restarts.
    const cooldown = LS_RESTART_COOLDOWN - (Date.now() - this.lsRestartedAt)
    if (cooldown > 0) await timeout(cooldown)
    this.lsRestartedAt = Date.now()

    try {
      await this.loadLSWasm()
      this.spxlcRef.value = new Spxlc(() => this.files)
      this.isLSRunning.value = true
    } catch (e) {
      console.error('[LSP] Failed to start language server:', e)
    } finally {
      this.isLSRestarting = false
    }
  }

  private async loadLSWasm() {
    await this.loadWasmScript()
    const [wasmResp, spxlsPkgdataZipResp] = await Promise.all([fetch(spxlsWasmUrl), fetch(spxlsPkgdataZipUrl)])

    const go = new Go()
    const { instance } = await WebAssembly.instantiateStreaming(wasmResp, go.importObject)
    go.run(instance).finally(() => {
      console.warn('[LSP] Language server process exited.')
      this.isLSRunning.value = false
      this.spxlcRef.value = null
    })

    // Load additional resources.
    const spxlsPkgdataZip = await spxlsPkgdataZipResp.arrayBuffer()
    SetCustomPkgdataZip(new Uint8Array(spxlsPkgdataZip))
    SetClassfileAutoImportedPackages('spx', { ai: 'github.com/goplus/builder/tools/ai' })
  }

  private async executeCommand<A extends any[], R>(command: string, ...args: A): Promise<R> {
    const spxlc = await this.prepareRequest()
    return tracedRequest(command, async () => {
      return spxlc.request<R>(lsp.ExecuteCommandRequest.method, {
        command,
        arguments: args
      })
    })
  }

  async workspaceExecuteCommandSpxGetDefinitions(
    ...params: spxGetDefinitions.Arguments
  ): Promise<spxGetDefinitions.Result> {
    return this.executeCommand<spxGetDefinitions.Arguments, spxGetDefinitions.Result>(
      spxGetDefinitions.command,
      ...params
    )
  }

  async workspaceExecuteCommandSpxRenameResources(
    ...params: spxRenameResources.Arguments
  ): Promise<spxRenameResources.Result> {
    return this.executeCommand<spxRenameResources.Arguments, spxRenameResources.Result>(
      spxRenameResources.command,
      ...params
    )
  }

  async workspaceExecuteCommandSpxGetInputSlots(
    ...params: spxGetInputSlots.Arguments
  ): Promise<spxGetInputSlots.Result> {
    return this.executeCommand<spxGetInputSlots.Arguments, spxGetInputSlots.Result>(spxGetInputSlots.command, ...params)
  }

  async textDocumentDocumentLink(params: lsp.DocumentLinkParams): Promise<lsp.DocumentLink[] | null> {
    const spxlc = await this.prepareRequest()
    return tracedRequest(lsp.DocumentLinkRequest.method, async () => {
      return spxlc.request<lsp.DocumentLink[] | null>(lsp.DocumentLinkRequest.method, params)
    })
  }

  async textDocumentDiagnostic(params: lsp.DocumentDiagnosticParams): Promise<lsp.DocumentDiagnosticReport> {
    const spxlc = await this.prepareRequest()
    return tracedRequest(lsp.DocumentDiagnosticRequest.method, async () => {
      return spxlc.request<lsp.DocumentDiagnosticReport>(lsp.DocumentDiagnosticRequest.method, params)
    })
  }

  async workspaceDiagnostic(params: lsp.WorkspaceDiagnosticParams): Promise<lsp.WorkspaceDiagnosticReport> {
    const spxlc = await this.prepareRequest()
    return tracedRequest(lsp.WorkspaceDiagnosticRequest.method, async () => {
      return spxlc.request<lsp.WorkspaceDiagnosticReport>(lsp.WorkspaceDiagnosticRequest.method, params)
    })
  }

  async textDocumentHover(params: lsp.HoverParams): Promise<lsp.Hover | null> {
    const spxlc = await this.prepareRequest()
    return tracedRequest(lsp.HoverRequest.method, async () => {
      return spxlc.request<lsp.Hover | null>(lsp.HoverRequest.method, params)
    })
  }

  async textDocumentCompletion(
    params: lsp.CompletionParams
  ): Promise<lsp.CompletionList | lsp.CompletionItem[] | null> {
    const spxlc = await this.prepareRequest()
    return tracedRequest(lsp.CompletionRequest.method, async () => {
      return spxlc.request<lsp.CompletionList | lsp.CompletionItem[] | null>(lsp.CompletionRequest.method, params)
    })
  }

  async textDocumentDefinition(params: lsp.DefinitionParams): Promise<lsp.Definition | null> {
    const spxlc = await this.prepareRequest()
    return tracedRequest(lsp.DefinitionRequest.method, async () => {
      return spxlc.request<lsp.Definition | null>(lsp.DefinitionRequest.method, params)
    })
  }

  async textDocumentTypeDefinition(params: lsp.TypeDefinitionParams): Promise<lsp.Definition | null> {
    const spxlc = await this.prepareRequest()
    return tracedRequest(lsp.DefinitionRequest.method, async () => {
      return spxlc.request<lsp.Definition | null>(lsp.TypeDefinitionRequest.method, params)
    })
  }

  async textDocumentPrepareRename(params: lsp.PrepareRenameParams): Promise<lsp.PrepareRenameResult | null> {
    const spxlc = await this.prepareRequest()
    return tracedRequest(lsp.PrepareRenameRequest.method, async () => {
      return spxlc.request<lsp.PrepareRenameResult | null>(lsp.PrepareRenameRequest.method, params)
    })
  }

  async textDocumentRename(params: lsp.RenameParams): Promise<lsp.WorkspaceEdit | null> {
    const spxlc = await this.prepareRequest()
    return tracedRequest(lsp.RenameRequest.method, async () => {
      return spxlc.request<lsp.WorkspaceEdit | null>(lsp.RenameRequest.method, params)
    })
  }

  async textDocumentFormatting(params: lsp.DocumentFormattingParams): Promise<lsp.TextEdit[] | null> {
    const spxlc = await this.prepareRequest()
    return tracedRequest(lsp.DocumentFormattingRequest.method, async () => {
      return spxlc.request<lsp.TextEdit[] | null>(lsp.DocumentFormattingRequest.method, params)
    })
  }

  async textDocumentInlayHint(params: lsp.InlayHintParams): Promise<lsp.InlayHint[] | null> {
    const spxlc = await this.prepareRequest()
    return tracedRequest(lsp.InlayHintRequest.method, async () => {
      return spxlc.request<lsp.InlayHint[] | null>(lsp.InlayHintRequest.method, params)
    })
  }

  // Higher-level APIs

  async getResourceReferences(textDocument: TextDocumentIdentifier): Promise<ResourceReference[]> {
    const documentLinks = await this.textDocumentDocumentLink({ textDocument })
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

  async getDefinition(textDocument: TextDocumentIdentifier, position: Position): Promise<DefinitionIdentifier | null> {
    const documentLinks = await this.textDocumentDocumentLink({ textDocument })
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

  async getCompletionItems(params: lsp.CompletionParams) {
    const completionResult = await this.textDocumentCompletion(params)
    if (completionResult == null) return []
    if (!Array.isArray(completionResult)) return [] // For now, we support CompletionItem[] only
    return completionResult as CompletionItem[]
  }

  async getInputSlots(textDocument: TextDocumentIdentifier): Promise<InputSlot[]> {
    const result = await this.workspaceExecuteCommandSpxGetInputSlots({ textDocument })
    if (result == null) return []
    return result.map((item) => ({
      ...item,
      range: fromLSPRange(item.range)
    }))
  }
}
