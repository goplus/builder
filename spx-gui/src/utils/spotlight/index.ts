import type { App, InjectionKey } from 'vue'
import { inject, ref } from 'vue'
import Emitter from '@/utils/emitter'

export { default as SpotlightUI } from './SpotlightUI.vue'

export type SpotlightItem = {
  el: HTMLElement
  timer: ReturnType<typeof setTimeout> | null
  tip: string
  mask: boolean
  dispose: () => void
}

export type SpotlightOptions = {
  tip?: string
  mask?: boolean
  duration?: number
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

  reveal(el: HTMLElement, options: SpotlightOptions = {}) {
    this.conceal() // Clear any previous spotlight

    const duration = options.duration == null ? autoConcealDelay : options.duration * 1_000
    const mask = options.mask ?? false
    const autoConcealTimer = duration > 0 ? this.createTimeoutConceal(duration) : null
    let mouseEnterConcealTimer: ReturnType<typeof setTimeout> | null = null
    const handleMouseEnter = () => (mouseEnterConcealTimer = this.createTimeoutConceal(mouseEnterConcealDelay))
    const clickTarget = mask ? el : document
    const handleClick = () => this.conceal()
    this.spotlightItem.value = {
      timer: autoConcealTimer,
      tip: options.tip ?? '',
      el,
      mask,
      dispose: () => {
        if (autoConcealTimer != null) clearTimeout(autoConcealTimer)
        if (mouseEnterConcealTimer != null) clearTimeout(mouseEnterConcealTimer)
        el.removeEventListener('mouseenter', handleMouseEnter)
        clickTarget.removeEventListener('click', handleClick, { capture: true })
      }
    }
    if (duration > 0) {
      el.addEventListener('mouseenter', handleMouseEnter, { once: true })
    }
    if (duration === 0) clickTarget.addEventListener('click', handleClick, { capture: true, once: true })
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
  }

  dispose() {
    this.conceal()
    super.dispose()
  }
}

export function createSpotlight() {
  return new Spotlight()
}
