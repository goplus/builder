import { describe, expect, it, vi } from 'vitest'
import { RPCError, RPCSession, type RPCHandler, type RPCResponse } from './rpc'

describe('RPCSession', () => {
  it('handles calls asynchronously and matches the response id', async () => {
    const sent: RPCResponse[] = []
    const handler: RPCHandler = {
      handle: vi.fn(() => ({ value: 'ok' }))
    }
    const session = new RPCSession(handler, (message) => sent.push(message))

    session.handleMessage({ jsonrpc: '2.0', id: 7, method: 'example/get', params: { input: 'value' } })
    expect(handler.handle).not.toHaveBeenCalled()
    expect(sent).toEqual([])
    await vi.waitFor(() => expect(sent).toHaveLength(1))

    expect(handler.handle).toHaveBeenCalledWith('example/get', { input: 'value' }, expect.any(AbortSignal))
    expect(sent[0]).toEqual({ jsonrpc: '2.0', id: 7, result: { value: 'ok' } })
  })

  it('returns protocol errors without exposing unexpected error text', async () => {
    const sent: RPCResponse[] = []
    const internal = new RPCSession(
      {
        handle() {
          throw new Error('sensitive detail')
        }
      },
      (message) => sent.push(message)
    )
    internal.handleMessage({ jsonrpc: '2.0', id: 1, method: 'example/fail' })
    await vi.waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]).toEqual({
      jsonrpc: '2.0',
      id: 1,
      error: { code: -32603, message: 'JSON-RPC internal error' }
    })

    const expected = new RPCSession(
      {
        handle() {
          throw new RPCError(-32601, 'JSON-RPC method not found')
        }
      },
      (message) => sent.push(message)
    )
    expected.handleMessage({ jsonrpc: '2.0', id: 'second', method: 'example/missing' })
    await vi.waitFor(() => expect(sent).toHaveLength(2))
    expect(sent[1]).toEqual({
      jsonrpc: '2.0',
      id: 'second',
      error: { code: -32601, message: 'JSON-RPC method not found' }
    })
  })

  it('cancels a pending call without sending a late response', async () => {
    const sent: RPCResponse[] = []
    const pending: { resolve: ((value: string) => void) | null; signal: AbortSignal | null } = {
      resolve: null,
      signal: null
    }
    const session = new RPCSession(
      {
        handle(_method, _params, currentSignal) {
          pending.signal = currentSignal
          return new Promise<string>((resolve) => {
            pending.resolve = resolve
          })
        }
      },
      (message) => sent.push(message)
    )

    session.handleMessage({ jsonrpc: '2.0', id: 3, method: 'example/wait' })
    await vi.waitFor(() => expect(pending.signal).not.toBeNull())
    session.handleMessage({ jsonrpc: '2.0', method: '$/cancelRequest', params: { id: 3 } })
    expect(pending.signal?.aborted).toBe(true)
    pending.resolve?.('late')
    await Promise.resolve()
    expect(sent).toEqual([])
  })

  it('closes pending work and ignores old-session messages', async () => {
    const sent: RPCResponse[] = []
    const close = vi.fn()
    const pending: { resolve: ((value: string) => void) | null; signal: AbortSignal | null } = {
      resolve: null,
      signal: null
    }
    const handler = vi.fn((_method: string, _params: unknown, currentSignal: AbortSignal) => {
      pending.signal = currentSignal
      return new Promise<string>((resolve) => {
        pending.resolve = resolve
      })
    })
    const session = new RPCSession({ handle: handler, close }, (message) => sent.push(message))

    session.handleMessage({ jsonrpc: '2.0', id: 4, method: 'example/wait' })
    await vi.waitFor(() => expect(pending.signal).not.toBeNull())
    session.close()
    session.close()
    expect(pending.signal?.aborted).toBe(true)
    expect(close).toHaveBeenCalledTimes(1)

    pending.resolve?.('late')
    session.handleMessage({ jsonrpc: '2.0', id: 5, method: 'example/new' })
    await Promise.resolve()
    expect(sent).toEqual([])
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('handles notifications without sending responses', async () => {
    const sent: RPCResponse[] = []
    const handle = vi.fn()
    const session = new RPCSession({ handle }, (message) => sent.push(message))

    session.handleMessage({ jsonrpc: '2.0', method: 'example/event', params: { value: true } })
    await vi.waitFor(() => expect(handle).toHaveBeenCalledTimes(1))
    expect(sent).toEqual([])
  })

  it('cancels handler state when delivering the response fails', async () => {
    const state: { signal: AbortSignal | null } = { signal: null }
    const session = new RPCSession(
      {
        handle(_method, _params, currentSignal) {
          state.signal = currentSignal
          return 'ok'
        }
      },
      () => {
        throw new Error('stale iframe')
      }
    )

    session.handleMessage({ jsonrpc: '2.0', id: 8, method: 'example/get' })
    await vi.waitFor(() => expect(state.signal?.aborted).toBe(true))
  })
})
