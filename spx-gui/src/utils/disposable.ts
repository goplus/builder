/**
 * @file Disposing related utilities
 */

import { markRaw } from 'vue'
import { Cancelled, TimeoutException } from './exception/base'

export type Disposer = () => void

export interface IDisposable {
  dispose(): void
}

export class Disposable implements IDisposable {
  // Sometimes model class may extends `Disposable`, a typical model class use `reactive(this)` to make its properties reactive.
  // We use `markRaw` to prevent Vue from making `disposers` reactive, which may cause unexpected dependency collection & triggering.
  private disposers: Disposer[] = markRaw([])

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

/** Merge multiple signals into one. The merged signal will be aborted when any of the input signals is aborted. */
export function mergeSignals(signal: AbortSignal, ...others: Array<AbortSignal | null | undefined>): AbortSignal
export function mergeSignals(...signals: Array<AbortSignal | null | undefined>): AbortSignal | null
export function mergeSignals(...signals: Array<AbortSignal | null | undefined>): AbortSignal | null {
  const nonEmptySignals = signals.filter((s) => s != null) as AbortSignal[]
  if (nonEmptySignals.length === 0) return null
  if (nonEmptySignals.length === 1) return nonEmptySignals[0]
  return AbortSignal.any(nonEmptySignals)
}

/** Create a signal which will be aborted after given timeout. The signal will be aborted with `TimeoutException`. */
export function getTimeoutSignal(timeout: number): [AbortSignal, Disposer] {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(new TimeoutException()), timeout)
  return [ctrl.signal, () => clearTimeout(timer)]
}

/** Create a promise which will be rejected when given signal is aborted. The promise will be rejected with the abort reason. */
export function promiseForSignal(signal: AbortSignal): Promise<never> {
  if (signal.aborted) return Promise.reject(signal.reason)
  return new Promise<never>((_, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true })
  })
}
