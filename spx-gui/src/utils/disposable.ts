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

  /** Dispose when given signal aborted. */
  disposeOnSignal(signal: AbortSignal) {
    if (signal.aborted) {
      this.dispose()
    } else {
      signal.addEventListener('abort', () => this.dispose(), { signal: this.ctrl.signal })
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

// TODO: Reimplement this with `AbortSignal.any()` once it is widely supported (including Node.js version we're using) or properly polyfilled.
export function mergeSignals(...signals: Array<AbortSignal | null | undefined>) {
  const nonEmptySignals = signals.filter((s) => s != null) as AbortSignal[]
  if (nonEmptySignals.length === 1) return nonEmptySignals[0]
  const ctrl = new AbortController()
  const resultSignal = ctrl.signal
  for (const signal of nonEmptySignals) {
    if (signal.aborted) {
      ctrl.abort(signal.reason)
      break
    }
    signal.addEventListener('abort', () => ctrl.abort(signal.reason), { signal: resultSignal })
  }
  return resultSignal
}
