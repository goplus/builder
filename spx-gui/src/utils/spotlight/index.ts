import type { App, InjectionKey } from 'vue'
import { inject, ref } from 'vue'
import Emitter from '@/utils/emitter'

export { default as SpotlightUI } from './SpotlightUI.vue'

export type SpotlightItem = {
  elements: HTMLElement[]
  timer: ReturnType<typeof setTimeout> | null
  tips: string
  mask: boolean
  dispose: () => void
}

export type SpotlightOptions = {
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

  reveal(elements: HTMLElement | HTMLElement[], tips = '', options: SpotlightOptions = {}) {
    this.conceal() // Clear any previous spotlight

    const targetElements = Array.isArray(elements) ? elements : [elements]
    if (targetElements.length === 0) return
    const duration = options.duration == null ? autoConcealDelay : options.duration * 1_000
    const autoConcealTimer = duration > 0 ? this.createTimeoutConceal(duration) : null
    let mouseEnterConcealTimer: ReturnType<typeof setTimeout> | null = null
    const handleMouseEnter = () => (mouseEnterConcealTimer = this.createTimeoutConceal(mouseEnterConcealDelay))
    const handleDocumentClick = () => this.conceal()
    this.spotlightItem.value = {
      timer: autoConcealTimer,
      tips,
      elements: targetElements,
      mask: options.mask ?? false,
      dispose: () => {
        if (autoConcealTimer != null) clearTimeout(autoConcealTimer)
        if (mouseEnterConcealTimer != null) clearTimeout(mouseEnterConcealTimer)
        for (const element of targetElements) element.removeEventListener('mouseenter', handleMouseEnter)
        document.removeEventListener('click', handleDocumentClick, { capture: true })
      }
    }
    if (duration > 0) {
      for (const element of targetElements) element.addEventListener('mouseenter', handleMouseEnter, { once: true })
    }
    if (duration === 0) document.addEventListener('click', handleDocumentClick, { capture: true, once: true })
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
