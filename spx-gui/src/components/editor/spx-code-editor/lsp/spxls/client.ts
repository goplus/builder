import type { NotificationMessage, RequestMessage, ResponseMessage, ResponseError as ResponseErrorObj } from './index'

/** Connection between the client and the language server. */
export interface IConnection {
  sendMessage(message: RequestMessage | NotificationMessage): void
  onMessage(handler: (message: ResponseMessage | NotificationMessage) => void): void
}

export interface OngoingRequest<T> {
  /** Unique ID of the request. */
  id: number
  /** Returns a promise that resolves with the response of the request. */
  response(): Promise<T>
}

/**
 * Language client wrapper for the XGo language server.
 */
export class XGoLanguageClient {
  private nextRequestId: number = 1
  private pendingRequests = new Map<
    number,
    {
      resolve: (response: any) => void
      reject: (error: any) => void
    }
  >()
  private notificationHandlers = new Map<string, (params: any) => void>()

  constructor(
    /** The connection to the language server. */
    private connection: IConnection
  ) {
    connection.onMessage((m) => this.handleMessage(m))
  }

  /**
   * Handles messages from the language server.
   * @param message Message from the server.
   * @throws Error if the message type is unknown.
   */
  private handleMessage(message: ResponseMessage | NotificationMessage): void {
    if ('id' in message) return this.handleResponseMessage(message)
    if ('method' in message) return this.handleNotificationMessage(message)
    throw new Error('unknown message type')
  }

  /**
   * Handles response messages from the language server.
   * @param message Response message from the server.
   * @throws Error if no pending request is found for the message ID.
   */
  private handleResponseMessage(message: ResponseMessage): void {
    const pending = this.pendingRequests.get(message.id)
    if (pending == null) {
      console.warn(`no pending request found for message ID: ${message.id}`, message)
      return
    }
    this.pendingRequests.delete(message.id)

    if ('error' in message && message.error != null) {
      pending.reject(new ResponseError(message.error))
    } else pending.resolve(message.result)
  }

  /**
   * Handles notification messages from the language server.
   * @param message Notification message from the server.
   * @throws Error if no handler is found for the notification method.
   */
  private handleNotificationMessage(message: NotificationMessage): void {
    const handler = this.notificationHandlers.get(message.method)
    if (handler == null) {
      console.warn(`no notification handler found for method: ${message.method}`, message)
      return
    }

    handler(message.params)
  }

  /**
   * Sends a request to the language server.
   * @param method LSP method name.
   * @param params Method parameters.
   * @returns The ongoing request, which can be used to get the response later.
   */
  request<T>(method: string, params?: any): OngoingRequest<T> {
    const id = this.nextRequestId++
    const respPromise = new Promise<T>((resolve, reject) => {
      const message: RequestMessage = {
        jsonrpc: '2.0',
        id,
        method,
        params
      }
      this.pendingRequests.set(id, { resolve, reject })
      // TODO: Catch errors on sending, and clear the pending request
      this.connection.sendMessage(message)
    })
    return {
      id,
      response: () => respPromise
    }
  }

  /**
   * Sends a notification to the language server (no response expected).
   * @param method LSP method name.
   * @param params Method parameters.
   */
  notify(method: string, params?: any): void {
    const message: NotificationMessage = {
      jsonrpc: '2.0',
      method,
      params
    }
    // TODO: Catch errors on sending, and clear the pending request
    this.connection.sendMessage(message)
  }

  /**
   * Registers a handler for server notifications.
   * @param method LSP method name.
   * @param handler Function to handle the notification.
   */
  onNotification(method: string, handler: (params: any) => void): void {
    this.notificationHandlers.set(method, handler)
  }

  /**
   * Cleans up client resources.
   */
  dispose(): void {
    this.pendingRequests.clear()
    this.notificationHandlers.clear()
  }
}

export class ResponseError extends Error {
  code: number
  data?: unknown
  constructor(obj: ResponseErrorObj) {
    super(obj.message)
    this.code = obj.code
    this.data = obj.data
  }
}
