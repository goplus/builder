import { shallowRef, watchEffect } from 'vue'
import { Disposable, getCleanupSignal } from '@/utils/disposable'
import { until, untilNotNull } from '@/utils/utils'
import type { Project } from '@/models/project'
import wasmExecScriptUrl from '@/assets/wasm_exec.js?url'
import spxlsWasmUrl from '@/assets/spxls.wasm?url'
import { Spxlc } from './spxls/client'
import type { Files as SpxlsFiles } from './spxls'
import { spxGetDefinitions } from './spxls/commands'

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
    const loadedFiles: SpxlsFiles = {}
    await Promise.all(Object.entries(files).map(async ([path, file]) => {
      if (file == null) return
      // TODO: can we omit static files like images & audios to reduce size of `files`?
      const ab = await file.arrayBuffer()
      loadedFiles[path] = { content: new Uint8Array(ab) }
    }))
    signal.throwIfAborted()
    this.files = loadedFiles
    this.isFilesStale.value = false
  }

  private async prepareRquest() {
    const [spxlc] = await Promise.all([
      untilNotNull(this.spxlcRef),
      until(() => !this.isFilesStale.value)
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
    return spxlc.request<R>('workspace/executeCommand', {
      command,
      arguments: args
    })
  }

  async getDefinitions(...params: spxGetDefinitions.Arguments): Promise<spxGetDefinitions.Result> {
    return this.executeCommand<spxGetDefinitions.Arguments, spxGetDefinitions.Result>(spxGetDefinitions.command, ...params)
  }

}
