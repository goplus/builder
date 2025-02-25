import { shallowRef, watchEffect } from 'vue'
import * as lsp from 'vscode-languageserver-protocol'
import { Disposable, getCleanupSignal } from '@/utils/disposable'
import { timeout, until, untilNotNull } from '@/utils/utils'
import { extname } from '@/utils/path'
import { toText } from '@/models/common/file'
import type { Project } from '@/models/project'
import wasmExecScriptUrl from '@/assets/wasm/wasm_exec.js?url'
import spxlsWasmUrl from '@/assets/wasm/spxls.wasm?url'
import {
  fromLSPRange,
  type DefinitionIdentifier,
  type Position,
  type ResourceReference,
  type TextDocumentIdentifier,
  containsPosition
} from '../common'
import { Spxlc } from './spxls/client'
import type { Files as SpxlsFiles } from './spxls'
import { spxGetDefinitions, spxRenameResources } from './spxls/commands'
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

async function loadGoWasm(wasmUrl: string) {
  await loadScript(wasmExecScriptUrl)
  const go = new Go()
  const { instance } = await WebAssembly.instantiateStreaming(fetch(wasmUrl), go.importObject)
  go.run(instance)
}

export class SpxLSPClient extends Disposable {
  constructor(private project: Project) {
    super()
  }

  private files: SpxlsFiles = {}
  private isFilesStale = shallowRef(true)
  private spxlcRef = shallowRef<Spxlc | null>(null)

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

  async init() {
    this.addDisposer(watchEffect((cleanUp) => this.loadFiles(getCleanupSignal(cleanUp))))
    await loadGoWasm(spxlsWasmUrl)
    this.spxlcRef.value = new Spxlc(() => this.files)
  }

  private async executeCommand<A extends any[], R>(command: string, ...args: A): Promise<R> {
    const spxlc = await this.prepareRequest()
    return spxlc.request<R>(lsp.ExecuteCommandRequest.method, {
      command,
      arguments: args
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

  async textDocumentDocumentLink(params: lsp.DocumentLinkParams): Promise<lsp.DocumentLink[] | null> {
    const spxlc = await this.prepareRequest()
    return spxlc.request<lsp.DocumentLink[] | null>(lsp.DocumentLinkRequest.method, params)
  }

  async textDocumentDiagnostic(params: lsp.DocumentDiagnosticParams): Promise<lsp.DocumentDiagnosticReport> {
    const spxlc = await this.prepareRequest()
    return spxlc.request<lsp.DocumentDiagnosticReport>(lsp.DocumentDiagnosticRequest.method, params)
  }

  async workspaceDiagnostic(params: lsp.WorkspaceDiagnosticParams): Promise<lsp.WorkspaceDiagnosticReport> {
    const spxlc = await this.prepareRequest()
    return spxlc.request<lsp.WorkspaceDiagnosticReport>(lsp.WorkspaceDiagnosticRequest.method, params)
  }

  async textDocumentHover(params: lsp.HoverParams): Promise<lsp.Hover | null> {
    const spxlc = await this.prepareRequest()
    return spxlc.request<lsp.Hover | null>(lsp.HoverRequest.method, params)
  }

  async textDocumentCompletion(
    params: lsp.CompletionParams
  ): Promise<lsp.CompletionList | lsp.CompletionItem[] | null> {
    const spxlc = await this.prepareRequest()
    return spxlc.request<lsp.CompletionList | lsp.CompletionItem[] | null>(lsp.CompletionRequest.method, params)
  }

  async textDocumentDefinition(params: lsp.DefinitionParams): Promise<lsp.Definition | null> {
    const spxlc = await this.prepareRequest()
    return spxlc.request<lsp.Definition | null>(lsp.DefinitionRequest.method, params)
  }

  async textDocumentTypeDefinition(params: lsp.TypeDefinitionParams): Promise<lsp.Definition | null> {
    const spxlc = await this.prepareRequest()
    return spxlc.request<lsp.Definition | null>(lsp.TypeDefinitionRequest.method, params)
  }

  async textDocumentPrepareRename(params: lsp.PrepareRenameParams): Promise<lsp.PrepareRenameResult | null> {
    const spxlc = await this.prepareRequest()
    return spxlc.request<lsp.PrepareRenameResult | null>(lsp.PrepareRenameRequest.method, params)
  }

  async textDocumentRename(params: lsp.RenameParams): Promise<lsp.WorkspaceEdit | null> {
    const spxlc = await this.prepareRequest()
    return spxlc.request<lsp.WorkspaceEdit | null>(lsp.RenameRequest.method, params)
  }

  async textDocumentFormatting(params: lsp.DocumentFormattingParams): Promise<lsp.TextEdit[] | null> {
    const spxlc = await this.prepareRequest()
    return spxlc.request<lsp.TextEdit[] | null>(lsp.DocumentFormattingRequest.method, params)
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
}
