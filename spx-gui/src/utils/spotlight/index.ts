import type { App, InjectionKey } from 'vue'
import { inject, ref } from 'vue'
import { Disposable } from '@/utils/disposable'

export { default as SpotlightUI } from './SpotlightUI.vue'

export type SpotlightItem = {
  el: HTMLElement
  timer: NodeJS.Timeout
  tips: string
}

export const spotlightKey: InjectionKey<Spotlight> = Symbol('spotlight')

const spotlightAutoConcealTimeout = 5000

export function useSpotlight() {
  const spotlight = inject(spotlightKey)
  if (spotlight == null) throw new Error('Spotlight not provided')
  return spotlight
}

export class Spotlight extends Disposable {
  spotlightItem = ref<SpotlightItem | null>(null)

  protected createTimeout() {
    return setTimeout(() => this.conceal(), spotlightAutoConcealTimeout)
  }

  reveal(el: HTMLElement, tips = '') {
    this.conceal() // Clear any previous spotlight
    this.spotlightItem.value = {
      timer: this.createTimeout(),
      tips,
      el
    }
  }

  conceal() {
    const prevItem = this.spotlightItem.value
    if (prevItem) {
      clearTimeout(prevItem.timer)
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
