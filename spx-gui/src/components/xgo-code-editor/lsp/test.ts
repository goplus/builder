import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { onTestFinished, vi } from 'vitest'
import { parseGoxMod, serializeGoxMod, type GoxMod } from '@/utils/xgo/gox-mod'
import { XGoLanguageClient } from './spxls/client'
import type { Files } from './spxls'
import { xgoPropertyRenamedNotification } from './spxls/notifications'
import type { MainMessage, WorkerMessage } from './worker'

export async function startWorker(
  initialSources: Record<string, string>,
  classFrameworkConfig: GoxMod = parseGoxMod('')
) {
  const incoming = new EventTarget()
  const outgoing = new EventTarget()
  const send = (data: MainMessage) => incoming.dispatchEvent(new MessageEvent('message', { data }))
  const client = new XGoLanguageClient({
    sendMessage: (message) => send({ type: 'lsp', message }),
    onMessage: (handler) => {
      outgoing.addEventListener('message', (event) => {
        handler((event as MessageEvent<WorkerMessage>).data.message)
      })
    }
  })
  onTestFinished(() => client.dispose())
  client.onNotification('telemetry/event', () => {})
  const propertyRenames: xgoPropertyRenamedNotification.Params[] = []
  client.onNotification(xgoPropertyRenamedNotification.method, (params) => propertyRenames.push(params))

  vi.stubGlobal(
    'self',
    Object.assign(incoming, {
      postMessage: (data: WorkerMessage) => outgoing.dispatchEvent(new MessageEvent('message', { data }))
    })
  )
  vi.stubGlobal('fetch', async (url: string) => {
    const name = basename(new URL(url).pathname)
    const content = await readFile(new URL(`../../../assets/wasm/${name}`, import.meta.url))
    return new Response(content, {
      headers: { 'Content-Type': name.endsWith('.wasm') ? 'application/wasm' : 'application/zip' }
    })
  })
  vi.resetModules()
  await import('./worker')
  send({ type: 'configure', classFrameworkConfig: serializeGoxMod(classFrameworkConfig) })

  let revision = 0
  const encoder = new TextEncoder()
  const setFiles = (sources: Record<string, string>) => {
    const files: Files = {}
    for (const [name, content] of Object.entries(sources)) {
      files[name] = { content: encoder.encode(content), modTime: ++revision }
    }
    send({ type: 'files', files })
  }
  setFiles(initialSources)

  const request = <T>(method: string, params: object) => client.request<T>(method, params).response()
  await request('initialize', {
    processId: null,
    rootUri: 'file:///',
    capabilities: {
      textDocument: {
        completion: { completionItem: { snippetSupport: true, documentationFormat: ['markdown'] } },
        hover: { contentFormat: ['markdown'] }
      }
    }
  })
  client.notify('initialized', {})
  const command = <T>(command: string, params: object) =>
    request<T>('workspace/executeCommand', { command, arguments: [params] })

  return { request, command, setFiles, propertyRenames }
}
