import { Files, NewSpxls, NotificationMessage, RequestMessage, ResponseMessage, Spxls } from '.'

/**
 * Client wrapper for the spxls.
 */
export class Spxlc {
  private ls: Spxls
  private nextRequestId: number = 1
  private pendingRequests = new Map<number, {
    resolve: (response: any) => void
    reject: (error: any) => void
  }>()
  private notificationHandlers = new Map<string, (params: any) => void>()

  /**
   * Creates a new client instance.
   * @param filesProvider Function that provides access to workspace files.
   */
  constructor(filesProvider: () => Files) {
    const ls = NewSpxls(filesProvider, this.handleMessage.bind(this))
    if (ls instanceof Error) throw ls
    this.ls = ls
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
    if (pending == null) throw new Error(`no pending request found for id: ${message.id}`)
    this.pendingRequests.delete(message.id)

    if ('error' in message) pending.reject(message.error)
    else pending.resolve(message.result)
  }

  /**
   * Handles notification messages from the language server.
   * @param message Notification message from the server.
   * @throws Error if no handler is found for the notification method.
   */
  private handleNotificationMessage(message: NotificationMessage): void {
    const handler = this.notificationHandlers.get(message.method)
    if (handler == null) throw new Error(`no notification handler found for method: ${message.method}`)

    handler(message.params)
  }

  /**
   * Sends a request to the language server and waits for response.
   * @param method LSP method name.
   * @param params Method parameters.
   * @returns Promise that resolves with the response.
   */
  request<T>(method: string, params?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = this.nextRequestId++

      const message: RequestMessage = {
        jsonrpc: '2.0',
        id,
        method,
        params
      }
      const err = this.ls.handleMessage(message)
      if (err != null) reject(err)

      this.pendingRequests.set(id, { resolve, reject })
    })
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
    const err = this.ls.handleMessage(message)
    if (err != null) throw err
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
