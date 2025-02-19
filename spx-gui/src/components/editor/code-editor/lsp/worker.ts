/**
 * This file is worker script for spxls (spx language server).
 * It runs in a Web Worker.
 */

declare const self: DedicatedWorkerGlobalScope

import '@/assets/wasm_exec.js'
import spxlsWasmUrl from '@/assets/spxls.wasm?url'
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
const lsIniting = initLS()
let files: Files = {}

async function initLS(): Promise<Spxls> {
  const go = new Go()
  const { instance } = await WebAssembly.instantiateStreaming(fetch(spxlsWasmUrl), go.importObject)
  go.run(instance)
  const ls = NewSpxls(
    () => files,
    (message) => {
      scope.postMessage({ type: 'lsp', message })
    }
  )
  if (ls instanceof Error) throw ls
  return ls
}

function main() {
  scope.addEventListener('message', async (event) => {
    const message = event.data
    switch (message.type) {
      case 'lsp': {
        const ls = await lsIniting
        const error = ls.handleMessage(message.message)
        if (error != null) throw error
        break
      }
      case 'files':
        files = message.files
        return
    }
  })
}

main()
