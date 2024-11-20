/**
 * @file Disposing related utilities
 */

import { Cancelled } from './exception'

export type Disposer = () => void

export class Disposable {
  private disposers: Disposer[] = []

  private _isDisposed = false
  get isDisposed() {
    return this._isDisposed
  }

  addDisposer = (disposer: Disposer) => {
    if (this._isDisposed) throw new Error('disposed')
    this.disposers.push(disposer)
  }

  dispose() {
    if (this._isDisposed) return
    this._isDisposed = true
    while (this.disposers.length > 0) {
      this.disposers.pop()?.()
    }
  }
}

export type OnCleanup = (disposer: Disposer) => void

export function getCleanupSignal(onCleanup: OnCleanup) {
  const ctrl = new AbortController()
  onCleanup(() => ctrl.abort(new Cancelled('cleanup')))
  return ctrl.signal
}
