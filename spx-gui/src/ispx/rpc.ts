export type RPCID = string | number

export type RPCRequest = {
  jsonrpc: '2.0'
  id?: RPCID
  method: string
  params?: unknown
}

export type RPCResponse = {
  jsonrpc: '2.0'
  id: RPCID
  result?: unknown
  error?: {
    code: number
    message: string
  }
}

export type RPCHandler = {
  handle(method: string, params: unknown, signal: AbortSignal): unknown | Promise<unknown>
  close?(): void
}

export class RPCError extends Error {
  constructor(
    readonly code: number,
    message: string
  ) {
    super(message)
    this.name = 'RPCError'
  }
}

const cancelRequestMethod = '$/cancelRequest'

export class RPCSession {
  private closed = false
  private pending = new Map<RPCID, AbortController>()

  constructor(
    private handler: RPCHandler,
    private sendMessage: (message: RPCResponse) => void
  ) {}

  handleMessage(message: unknown) {
    if (this.closed || !isRPCRequest(message)) return
    if (message.method === cancelRequestMethod) {
      const id = getCancelRequestID(message.params)
      if (id != null) this.pending.get(id)?.abort()
      return
    }
    queueMicrotask(() => void this.handleRequest(message))
  }

  close() {
    if (this.closed) return
    this.closed = true
    for (const controller of this.pending.values()) controller.abort()
    this.pending.clear()
    this.handler.close?.()
  }

  private async handleRequest(request: RPCRequest) {
    if (this.closed) return
    if (request.id == null) {
      try {
        await this.handler.handle(request.method, request.params, new AbortController().signal)
      } catch {
        // Notifications have no response and must not affect the runner.
      }
      return
    }

    const controller = new AbortController()
    this.pending.set(request.id, controller)
    try {
      const result = await this.handler.handle(request.method, request.params, controller.signal)
      if (this.closed || controller.signal.aborted) return
      if (!this.send({ jsonrpc: '2.0', id: request.id, result: result ?? null })) controller.abort()
    } catch (error) {
      if (this.closed || controller.signal.aborted) return
      const rpcError = error instanceof RPCError ? error : new RPCError(-32603, 'JSON-RPC internal error')
      if (
        !this.send({
          jsonrpc: '2.0',
          id: request.id,
          error: { code: rpcError.code, message: rpcError.message }
        })
      ) {
        controller.abort()
      }
    } finally {
      if (this.pending.get(request.id) === controller) this.pending.delete(request.id)
    }
  }

  private send(message: RPCResponse) {
    try {
      this.sendMessage(message)
      return true
    } catch {
      // The iframe may already be stale; the iSPX call will time out or close.
      return false
    }
  }
}

function isRPCRequest(value: unknown): value is RPCRequest {
  if (value == null || typeof value !== 'object') return false
  const message = value as Partial<RPCRequest>
  return (
    message.jsonrpc === '2.0' &&
    typeof message.method === 'string' &&
    (message.id == null || typeof message.id === 'string' || typeof message.id === 'number')
  )
}

function getCancelRequestID(params: unknown): RPCID | null {
  if (params == null || typeof params !== 'object') return null
  const id = (params as { id?: unknown }).id
  return typeof id === 'string' || typeof id === 'number' ? id : null
}
