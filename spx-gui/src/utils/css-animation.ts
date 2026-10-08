import { timeout } from './utils'

/** Update a transition target with a CSS class, skipping the wait when no transition is expected. */
export async function animateCSS(
  className: string,
  el: HTMLElement | null | undefined,
  update: () => void,
  shouldAnimate: boolean,
  signal?: AbortSignal
) {
  signal?.throwIfAborted()
  if (!shouldAnimate || el == null) {
    update()
    return
  }
  const element = el
  // Force reflow before changing the transition target.
  void element.offsetHeight
  element.classList.add(className)
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
    try {
      update()
    } catch (error) {
      cleanup()
      reject(error)
    }
  })
  // Let the remaining transitionend events from this stage finish before the next
  // stage registers its listener. Copilot's trigger transitions opacity and transform
  // together; without this pause, the second event prematurely ends the panel animation.
  // TODO: Match transitionend events by target element and CSS property for each stage,
  // so unrelated events cannot finish the next stage and this pause can be removed.
  await timeout(0, signal)
}
