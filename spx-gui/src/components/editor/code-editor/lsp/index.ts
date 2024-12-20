import { shallowRef, watchEffect } from 'vue'
import * as lsp from 'vscode-languageserver-protocol'
import { Disposable, getCleanupSignal } from '@/utils/disposable'
import { timeout, until, untilNotNull } from '@/utils/utils'
import { extname } from '@/utils/path'
import { toText } from '@/models/common/file'
import type { Project } from '@/models/project'
import wasmExecScriptUrl from '@/assets/wasm_exec.js?url'
import spxlsWasmUrl from '@/assets/spxls.wasm?url'
import { Spxlc } from './spxls/client'
import type { Files as SpxlsFiles } from './spxls'
import { spxGetDefinitions, spxRenameResources } from './spxls/commands'

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
          loadedFiles[path] = { content: new Uint8Array(ab) }
          debugFiles[path] = await toText(file)
        }
      })
    )
    signal.throwIfAborted()
    this.files = loadedFiles
    this.isFilesStale.value = false
  }

  private async prepareRquest() {
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
    const spxlc = await this.prepareRquest()
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
    const spxlc = await this.prepareRquest()
    return spxlc.request<lsp.DocumentLink[] | null>(lsp.DocumentLinkRequest.method, params)
  }

  async textDocumentDiagnostic(params: lsp.DocumentDiagnosticParams): Promise<lsp.DocumentDiagnosticReport> {
    const spxlc = await this.prepareRquest()
    return spxlc.request(lsp.DocumentDiagnosticRequest.method, params)
  }
}
