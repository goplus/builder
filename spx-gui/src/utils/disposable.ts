/**
 * @file Disposing related utilities
 */

import { markRaw } from 'vue'
import { Cancelled } from './exception/base'

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

export function mergeSignals(...signals: Array<AbortSignal | null | undefined>): AbortSignal | null {
  const nonEmptySignals = signals.filter((s) => s != null) as AbortSignal[]
  if (nonEmptySignals.length === 0) return null
  if (nonEmptySignals.length === 1) return nonEmptySignals[0]
  // TODO: Remove the `as any` cast with typescript 5.5 or later.
  return (AbortSignal as any).any(nonEmptySignals)
}
