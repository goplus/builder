/**
 * @file Disposing related utilities
 */

import { Cancelled } from './exception'

export type Disposer = () => void

export interface IDisposable {
  dispose(): void
}

export class Disposable implements IDisposable {
  private disposers: Disposer[] = []

  private ctrl = new AbortController()
  get isDisposed() {
    return this.ctrl.signal.aborted
  }

  addDisposer(disposer: Disposer) {
    if (this.isDisposed) throw new Error('disposed')
    this.disposers.push(disposer)
  }

  addDisposable(disposable: IDisposable) {
    this.addDisposer(() => disposable.dispose())
  }

  dispose() {
    if (this.isDisposed) return
    this.ctrl.abort(new Cancelled('dispose'))
    while (this.disposers.length > 0) {
      this.disposers.pop()?.()
    }
  }

  getSignal() {
    return this.ctrl.signal
  }
}

export type OnCleanup = (disposer: Disposer) => void

export function getCleanupSignal(onCleanup: OnCleanup) {
  const ctrl = new AbortController()
  onCleanup(() => ctrl.abort(new Cancelled('cleanup')))
  return ctrl.signal
}
