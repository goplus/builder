import { timeout } from './utils'

/** Animate a CSS class and wait for its transition, with optional cancellation. */
export function createCSSAnimation(className: string, el: HTMLElement | null | undefined, signal?: AbortSignal) {
  let begun = false
  return {
    begin(can = true) {
      signal?.throwIfAborted()
      if (!can || el == null) return
      // Force reflow before changing the transition target.
      void el.offsetHeight
      el.classList.add(className)
      begun = true
    },
    async endAndWait() {
      signal?.throwIfAborted()
      if (!begun || el == null) return
      const element = el
      await new Promise<void>((resolve, reject) => {
        function cleanup() {
          element.removeEventListener('transitionend', onEnd)
          signal?.removeEventListener('abort', onAbort)
          element.classList.remove(className)
        }
        function onEnd() {
          cleanup()
          resolve()
        }
        function onAbort() {
          cleanup()
          reject(signal?.reason)
        }
        element.addEventListener('transitionend', onEnd)
        signal?.addEventListener('abort', onAbort, { once: true })
      })
      // Preserve the original pause between animation stages after removing the class.
      // This does not guarantee a rendered frame; begin() forces reflow, so the pause may
      // be redundant. Verify consecutive transitions in browsers before removing it.
      await timeout(0, signal)
    }
  }
}
