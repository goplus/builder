/**
 * This file is worker script for spxls (spx language server).
 * It runs in a Web Worker.
 */

/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope

import '@/assets/wasm/wasm_exec.js'
import spxlsWasmUrl from '@/assets/wasm/spxls.wasm?url'
import spxlsPkgdataZipUrl from '@/assets/wasm/spxls-pkgdata.zip?url'
import type { Files, Message, NotificationMessage, RequestMessage, ResponseMessage, XGoLanguageServer } from './spxls'

/** Message for files synchronization */
export type FilesMessage = {
  type: 'files'
  files: Files
}

/** Message for LSP interactions */
export type LSPMessage<M extends Message> = {
  type: 'lsp'
  message: M
}

/** Message that worker send to main thread. */
export type WorkerMessage = LSPMessage<ResponseMessage | NotificationMessage>

/** Message that main thread send to worker. */
export type MainMessage = LSPMessage<RequestMessage | NotificationMessage> | FilesMessage

interface WorkerScope {
  postMessage(message: WorkerMessage): void
  addEventListener(type: 'message', listener: (event: MessageEvent<MainMessage>) => void): void
}

export interface WorkerHandler {
  postMessage(message: MainMessage): void
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerMessage>) => void): void
  terminate(): void
}

const scope: WorkerScope = self

// 10 seconds cooldown between language server restarts.
const LS_RESTART_COOLDOWN = 10_000

type LSState =
  | {
      state: 'starting'
      startAt: number
      lsPromise: Promise<XGoLanguageServer>
    }
  | {
      state: 'running'
      startAt: number
      ls: XGoLanguageServer
    }
  | {
      state: 'stopped'
      startAt: number
    }

let files: Files = {}
let lsState: LSState

async function newLS(onStopped: () => void): Promise<XGoLanguageServer> {
  const go = new Go()
  const [wasmResp, spxlsPkgdataZipResp] = await Promise.all([fetch(spxlsWasmUrl), fetch(spxlsPkgdataZipUrl)])
  const { instance } = await WebAssembly.instantiateStreaming(wasmResp, go.importObject)
  go.run(instance).finally(onStopped)

  // Load additional resources.
  const spxlsPkgdataZip = await spxlsPkgdataZipResp.arrayBuffer()
  SetCustomPkgdataZip(new Uint8Array(spxlsPkgdataZip))
  SetClassfileAutoImportedPackages('spx', { ai: 'github.com/goplus/builder/tools/ai' })

  const ls = NewXGoLanguageServer(
    () => files,
    (message) => scope.postMessage({ type: 'lsp', message })
  )
  if (ls instanceof Error) throw ls
  return ls
}

function startLS() {
  function onLSStarted(ls: XGoLanguageServer) {
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
    lsPromise
  }
  lsPromise.then(onLSStarted, onLSStopped)
}

async function handleMainMessage(message: MainMessage) {
  switch (message.type) {
    case 'files':
      files = message.files
      return
    case 'lsp': {
      switch (lsState.state) {
        case 'starting': {
          const ls = await lsState.lsPromise
          const err = ls.handleMessage(message.message)
          if (err != null) console.warn('[LSP] ls.handleMessage error:', err)
          break
        }
        case 'running': {
          const err = lsState.ls.handleMessage(message.message)
          if (err != null) console.warn('[LSP] ls.handleMessage error:', err)
          break
        }
        case 'stopped': {
          const now = Date.now()
          if (now - lsState.startAt < LS_RESTART_COOLDOWN) return
          startLS()
          handleMainMessage(message)
          break
        }
      }
      break
    }
  }
}

function main() {
  startLS()

  scope.addEventListener('message', async (event) => {
    handleMainMessage(event.data)
  })
}

main()
