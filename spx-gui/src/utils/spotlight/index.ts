import type { App, InjectionKey } from 'vue'
import { inject, ref } from 'vue'
import Emitter from '@/utils/emitter'

export { default as SpotlightUI } from './SpotlightUI.vue'

export type SpotlightItem = {
  el: HTMLElement
  tips: string
  /** Whether everything except the revealed element is dimmed with a mask overlay. */
  mask: boolean
  dispose: () => void
}

export type RevealOptions = {
  /**
   * Dim everything except the revealed element with a mask overlay. The mask never blocks
   * pointer events — it only draws attention. Defaults to `false`.
   */
  mask?: boolean
  /**
   * Keep the spotlight until the user clicks somewhere (anywhere, including the revealed element),
   * instead of auto-concealing after a delay. For proactive pointing that must not vanish before
   * the user has looked at it. Defaults to `false`.
   */
  persist?: boolean
}

export type RevealEvent = {
  rect: DOMRect
}

export const spotlightKey: InjectionKey<Spotlight> = Symbol('spotlight')

const autoConcealDelay = 5000
const mouseEnterConcealDelay = 600

export function useSpotlight() {
  const spotlight = inject(spotlightKey)
  if (spotlight == null) throw new Error('Spotlight not provided')
  return spotlight
}

export class Spotlight extends Emitter<{ revealed: RevealEvent }> {
  spotlightItem = ref<SpotlightItem | null>(null)

  protected createTimeoutConceal(timeout = autoConcealDelay) {
    return setTimeout(() => this.conceal(), timeout)
  }

  reveal(el: HTMLElement, tips = '', options: RevealOptions = {}) {
    this.conceal() // Clear any previous spotlight

    if (options.persist === true) {
      // Stay until the user clicks anywhere (the target itself counts — they acted on it).
      // Attach on the next frame so the click that triggered this reveal (e.g. the send button)
      // does not immediately dismiss it.
      const onPointerDown = () => this.conceal()
      const raf = requestAnimationFrame(() =>
        document.addEventListener('pointerdown', onPointerDown, { once: true, capture: true })
      )
      this.spotlightItem.value = {
        tips,
        el,
        mask: options.mask ?? false,
        dispose: () => {
          cancelAnimationFrame(raf)
          document.removeEventListener('pointerdown', onPointerDown, { capture: true })
        }
      }
      return
    }

    const autoConcealTimer = this.createTimeoutConceal()
    let mouseEnterConcealTimer: NodeJS.Timeout
    const handleMouseEnter = () => (mouseEnterConcealTimer = this.createTimeoutConceal(mouseEnterConcealDelay))
    this.spotlightItem.value = {
      tips,
      el,
      mask: options.mask ?? false,
      dispose: () => {
        clearTimeout(autoConcealTimer)
        clearTimeout(mouseEnterConcealTimer)
        el.removeEventListener('mouseenter', handleMouseEnter)
      }
    }
    el.addEventListener('mouseenter', handleMouseEnter, { once: true })
  }

  conceal() {
    const prevItem = this.spotlightItem.value
    if (prevItem) {
      prevItem.dispose()
    }
    this.spotlightItem.value = null
  }

  install(app: App<unknown>) {
    app.provide(spotlightKey, this)
    ;(window as any).spotlight = this // TODO: remove this line in production
  }

  dispose() {
    this.conceal()
    super.dispose()
  }
}

export function createSpotlight() {
  return new Spotlight()
}
