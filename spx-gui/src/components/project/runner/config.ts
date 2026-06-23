import { inject, type App, type InjectionKey } from 'vue'

const spxVersionKey: InjectionKey<string> = Symbol('spx-version')

export function provideSpxVersion(app: App, spxVersion: string) {
  app.provide(spxVersionKey, spxVersion)
}

export function useSpxVersion() {
  const spxVersion = inject(spxVersionKey)
  if (spxVersion == null) throw new Error('SPX version is not provided')
  return spxVersion
}
