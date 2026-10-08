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
      // Let the remaining transitionend events from this stage finish before the next
      // stage registers its listener. Copilot's trigger transitions opacity and transform
      // together; without this pause, the second event prematurely ends the panel animation.
      await timeout(0, signal)
    }
  }
}
