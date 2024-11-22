import type { Disposer } from '@/utils/disposable'

// TODO: use implementation from `/tools/spxls/client.ts`
export class Spxlc {
  /**
   * Sends a request to the language server and waits for response.
   * @param method LSP method name.
   * @param params Method parameters.
   * @returns Promise that resolves with the response.
   */
  request<T>(method: string, params?: any): Promise<T> {
    console.warn('TODO', method, params)
    return null as any
  }

  /**
   * Sends a notification to the language server (no response expected).
   * @param method LSP method name.
   * @param params Method parameters.
   */
  notify(method: string, params?: any): void {
    console.warn('TODO', method, params)
  }

  /**
   * Registers a handler for server notifications.
   * @param method LSP method name.
   * @param handler Function to handle the notification.
   */
  onNotification(method: string, handler: (params: any) => void): Disposer {
    console.warn('TODO', method, handler)
    return () => {}
  }

  /**
   * Cleans up client resources.
   */
  dispose(): void {
    console.warn('TODO')
  }
}
