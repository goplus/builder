import { inject, type App, type InjectionKey } from 'vue'

const disableAIGCKey: InjectionKey<boolean> = Symbol('disable-aigc')

export function provideDisableAIGC(app: App, disableAIGC: boolean) {
  app.provide(disableAIGCKey, disableAIGC)
}

export function useDisableAIGC() {
  const disableAIGC = inject(disableAIGCKey)
  if (disableAIGC == null) throw new Error('AIGC config is not provided')
  return disableAIGC
}
