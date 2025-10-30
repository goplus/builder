import { BrowserWindow, ipcMain, ipcRenderer } from 'electron'

interface MainMethodConstraint<A, R> {}

type MainMethod<A extends any[], R> = string & MainMethodConstraint<A, R>

type HandlerForMethod<M> = M extends MainMethod<infer A, infer R> ? (...args: A) => R : never

interface MainEventConstraint<A> {}

type MainEvent<A extends any[]> = string & MainEventConstraint<A>

type HandlerForEvent<E> = E extends MainEvent<infer A> ? (...args: A) => void : never

export function invokeMainMethod<A extends any[], R>(
  method: MainMethod<A, R>,
  ...args: A
): Promise<R> {
  return ipcRenderer.invoke(method, ...args)
}

export function defineMainMethod<M extends MainMethod<any[], any>>(
  method: M,
  handler: HandlerForMethod<M>
) {
  return ipcMain.handle(method, (event, ...args: Parameters<HandlerForMethod<M>>) => handler(...args))
}

export function sendMainEvent<E extends MainEvent<any[]>>(
  window: BrowserWindow | null,
  event: E,
  ...args: Parameters<HandlerForEvent<E>>
) {
  console.debug(`Sending main event: ${event}`, ...args)
  if (window == null) {
    console.warn(`Cannot send event ${event}: main window is not initialized`)
    return
  }
  window.webContents.send(event, ...args)
}

export function onMainEvent<E extends MainEvent<any[]>>(
  event: E,
  handler: HandlerForEvent<E>
) {
  ipcRenderer.on(event, (e, ...args: Parameters<HandlerForEvent<E>>) => handler(...args))
}

export function onceMainEvent<E extends MainEvent<any[]>>(
  event: E,
  handler: HandlerForEvent<E>
) {
  ipcRenderer.once(event, (e, ...args: Parameters<HandlerForEvent<E>>) => handler(...args))
}

/** Main methods */
export namespace mm {
  export const setAIInteractionAPIEndpoint: MainMethod<[string], void> = 'setAIInteractionAPIEndpoint'
  export const setAIInteractionAPIToken: MainMethod<[string], void> = 'setAIInteractionAPIToken'
  export const setAIDescription: MainMethod<[string], void> = 'setAIDescription'
  export const startGame: MainMethod<
    [buffer: ArrayBuffer],
    void
  > = 'startGame'
  export const stopGame: MainMethod<[], void> = 'stopGame'
}

/** Main events */
export namespace me {
  export const gameError: MainEvent<[err: string]> = 'gameError'
  export const gameExit: MainEvent<[code: number]> = 'gameExit'
  export const console: MainEvent<[type: string, msg: string]> = 'console'
}
