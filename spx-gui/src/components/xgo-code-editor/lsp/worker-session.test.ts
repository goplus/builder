// @vitest-environment node

import { afterEach, expect, it, vi } from 'vitest'
import type { Files } from './spxls'
import type { MainMessage } from './worker'

vi.mock('@/assets/wasm/wasm_exec.js', () => ({}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('handles messages immediately after initialization and reuses the configuration on restart', async () => {
  const incoming = new EventTarget()
  const send = (data: MainMessage) => incoming.dispatchEvent(new MessageEvent('message', { data }))
  const stops: Array<() => void> = []
  const handleMessage = vi.fn(() => null)
  const createServer = vi.fn(() => ({ handleMessage }))
  vi.stubGlobal('self', Object.assign(incoming, { postMessage: vi.fn() }))
  vi.stubGlobal(
    'Go',
    class {
      importObject = {}
      run() {
        return new Promise<void>((resolve) => stops.push(resolve))
      }
    }
  )
  vi.stubGlobal('NewXGoLanguageServer', createServer)
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response())
  )
  vi.spyOn(WebAssembly, 'instantiateStreaming').mockResolvedValue({
    instance: {} as WebAssembly.Instance,
    module: {} as WebAssembly.Module
  })
  const now = vi.spyOn(Date, 'now').mockReturnValue(0)
  vi.resetModules()
  await import('./worker')

  const classFrameworkConfig = 'project _course.gox Course example.com/tutorial\n'
  const files: Files = { 'main_course.gox': { content: new TextEncoder().encode('onStart => {}'), modTime: 1 } }
  const message = { jsonrpc: '2.0' as const, id: 1, method: 'initialize', params: {} }
  send({ type: 'initialize', classFrameworkConfig })
  send({ type: 'files', files })
  send({ type: 'lsp', message })
  await vi.waitFor(() => expect(handleMessage).toHaveBeenCalledWith(message))
  stops[0]()
  await Promise.resolve()
  now.mockReturnValue(10_000)
  send({ type: 'lsp', message: { ...message, id: 2 } })
  await vi.waitFor(() => expect(handleMessage).toHaveBeenCalledWith({ ...message, id: 2 }))
  expect(createServer).toHaveBeenCalledTimes(2)
  for (const call of createServer.mock.calls) {
    expect(call).toEqual([
      expect.any(Function),
      expect.any(Function),
      { classfileConfig: classFrameworkConfig, pkgDataZip: expect.any(Uint8Array) }
    ])
  }
})
