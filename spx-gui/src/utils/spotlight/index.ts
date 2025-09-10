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
  target: HTMLElement
  rect: DOMRect
}

export const spotlightKey: InjectionKey<Spotlight> = Symbol('spotlight')

const spotlightAutoConcealTimeout = 5000

export function useSpotlight() {
  const spotlight = inject(spotlightKey)
  if (spotlight == null) throw new Error('Spotlight not provided')
  return spotlight
}

export class Spotlight extends Emitter<{ onReveal: RevealEvent }> {
  spotlightItem = ref<SpotlightItem | null>(null)

  protected createTimeout() {
    return setTimeout(() => this.conceal(), spotlightAutoConcealTimeout)
  }

  reveal(el: HTMLElement, tips = '') {
    this.conceal() // Clear any previous spotlight

    const mouseEnterHandler = () => this.conceal()
    const timer = this.createTimeout()
    this.spotlightItem.value = {
      timer,
      tips,
      el,
      dispose: () => {
        clearTimeout(timer)
        el.removeEventListener('mouseenter', mouseEnterHandler)
      }
    }
    el.addEventListener('mouseenter', mouseEnterHandler, { once: true })
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
