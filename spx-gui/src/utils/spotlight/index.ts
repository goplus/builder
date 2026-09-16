import type { App, InjectionKey } from 'vue'
import { inject, ref } from 'vue'
import Emitter from '@/utils/emitter'

export { default as SpotlightUI } from './SpotlightUI.vue'

export type SpotlightItem = {
  el: HTMLElement
  timer: NodeJS.Timeout
  tips: string
  dispose: () => void
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

  reveal(el: HTMLElement, tips = '') {
    this.conceal() // Clear any previous spotlight

    const autoConcealTimer = this.createTimeoutConceal()
    let mouseEnterConcealTimer: NodeJS.Timeout
    const handleMouseEnter = () => (mouseEnterConcealTimer = this.createTimeoutConceal(mouseEnterConcealDelay))
    this.spotlightItem.value = {
      timer: autoConcealTimer,
      tips,
      el,
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
