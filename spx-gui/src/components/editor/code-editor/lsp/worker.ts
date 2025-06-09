/**
 * This file is worker script for spxls (spx language server).
 * It runs in a Web Worker.
 */

declare const self: DedicatedWorkerGlobalScope

import '@/assets/wasm/wasm_exec.js'
import spxlsWasmUrl from '@/assets/wasm/spxls.wasm?url'
import spxlsPkgdataZipUrl from '@/assets/wasm/spxls-pkgdata.zip?url'
import type { Files, Message, NotificationMessage, RequestMessage, ResponseMessage, Spxls } from './spxls'

export type FilesMessage = {
  type: 'files'
  files: Files
}

export type LSPMessage<M extends Message> = {
  type: 'lsp'
  message: M
}

/** Message that worker send to main thread. */
export type WorkerMessage = LSPMessage<ResponseMessage | NotificationMessage>

/** Message that main thread send to worker. */
export type MainMessage = LSPMessage<RequestMessage | NotificationMessage> | FilesMessage

interface IWorkerScope {
  postMessage(message: WorkerMessage): void
  addEventListener(type: 'message', listener: (event: MessageEvent<MainMessage>) => void): void
}

export interface IWorkerHandler {
  postMessage(message: MainMessage): void
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerMessage>) => void): void
  terminate(): void
}

const scope: IWorkerScope = self

async function newLS(onStopped: () => void): Promise<Spxls> {
  const go = new Go()
  const [wasmResp, spxlsPkgdataZipResp] = await Promise.all([fetch(spxlsWasmUrl), fetch(spxlsPkgdataZipUrl)])
  const { instance } = await WebAssembly.instantiateStreaming(wasmResp, go.importObject)
  go.run(instance).finally(onStopped)

  // Load additional resources.
  const spxlsPkgdataZip = await spxlsPkgdataZipResp.arrayBuffer()
  SetCustomPkgdataZip(new Uint8Array(spxlsPkgdataZip))
  SetClassfileAutoImportedPackages('spx', { ai: 'github.com/goplus/builder/tools/ai' })

  const ls = NewSpxls(
    () => files,
    (message) => {
      scope.postMessage({ type: 'lsp', message })
    }
  )
  if (ls instanceof Error) throw ls
  return ls
}

// 10 seconds cooldown between language server restarts.
const LS_RESTART_COOLDOWN = 10_000

type LSState = {
  state: 'starting'
  startAt: number
  ls: Promise<Spxls>
} | {
  state: 'running'
  startAt: number
  ls: Spxls
} | {
  state: 'stopped'
  startAt: number
}

let files: Files = {}
// const lsIniting = initLS()
let lsState: LSState

function startLS() {

  function onLSStarted(ls: Spxls) {
    lsState = {
      state: 'running',
      startAt: lsState.startAt,
      ls
    }
  }

  function onLSStopped() {
    lsState = {
      state: 'stopped',
      startAt: lsState.startAt
    }
  }

  const lsPromise = newLS(onLSStopped)
  lsState = {
    state: 'starting',
    startAt: Date.now(),
    ls: lsPromise
  }
  lsPromise.then(onLSStarted, onLSStopped)
}

function main() {

  startLS()

  scope.addEventListener('message', async (event) => {
    const message = event.data
    switch (message.type) {
      case 'lsp': {
        switch (lsState.state) {
          case 'starting':
          case 'running': {
            const ls = await lsState.ls
            const sendAt = performance.now()
            const error = ls.handleMessage(message.message)
            if (error != null) throw error
            const time = performance.now() - sendAt
            console.debug(`[LSP] ${message.message.method} (${(message.message as any).id}) took ${Math.round(time)}ms in worker`)
            break
          }
          case 'stopped': {
            const now = Date.now()
            if (now - lsState.startAt < LS_RESTART_COOLDOWN) return
            startLS()
            break
          }
        }
        break
      }
      case 'files':
        files = message.files
        return
    }
  })
}

main()
