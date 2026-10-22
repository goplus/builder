/**
 * Runs the XGo language server with the caller's class framework configuration.
 * It runs in a Web Worker.
 */

/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope

import '@/assets/wasm/wasm_exec.js'
import type { Files, Message, NotificationMessage, RequestMessage, ResponseMessage, XGoLanguageServer } from './spxls'

const languageServerWasmUrl = new URL('@/assets/wasm/spxls.wasm', import.meta.url).href
const packageDataZipUrl = new URL('@/assets/wasm/spxls-pkgdata.zip', import.meta.url).href

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

/** One-time message that initializes the language server Worker. */
export type InitializeMessage = {
  type: 'initialize'
  classFrameworkConfig: string
}

/** Message that worker send to main thread. */
export type WorkerMessage = LSPMessage<ResponseMessage | NotificationMessage>

/** Message that main thread send to worker. */
export type MainMessage = LSPMessage<RequestMessage | NotificationMessage> | FilesMessage | InitializeMessage

export interface WorkerHandler {
  postMessage(message: MainMessage): void
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerMessage>) => void): void
  terminate(): void
}

const scope = self

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

function main(classFrameworkConfig: string) {
  let files: Files = {}
  let lsState: LSState

  async function newLS(onStopped: () => void): Promise<XGoLanguageServer> {
    const go = new Go()
    const [wasmResp, packageDataZipResp] = await Promise.all([fetch(languageServerWasmUrl), fetch(packageDataZipUrl)])
    const { instance } = await WebAssembly.instantiateStreaming(wasmResp, go.importObject)
    go.run(instance).finally(onStopped)

    const packageDataZip = await packageDataZipResp.arrayBuffer()
    const ls = NewXGoLanguageServer(
      () => files,
      (message) => scope.postMessage({ type: 'lsp', message }),
      {
        classfileConfig: classFrameworkConfig,
        pkgDataZip: new Uint8Array(packageDataZip)
      }
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

  async function handleMainMessage(message: Exclude<MainMessage, InitializeMessage>) {
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
            const restartDelay = lsState.startAt + LS_RESTART_COOLDOWN - Date.now()
            if (restartDelay > 0) {
              await new Promise((resolve) => setTimeout(resolve, restartDelay))
              return handleMainMessage(message)
            }
            startLS()
            return handleMainMessage(message)
          }
        }
        break
      }
    }
  }

  scope.addEventListener('message', (event: MessageEvent<Exclude<MainMessage, InitializeMessage>>) => {
    handleMainMessage(event.data)
  })
  startLS()
}

scope.addEventListener('message', (event: MessageEvent<InitializeMessage>) => main(event.data.classFrameworkConfig), {
  once: true
})
