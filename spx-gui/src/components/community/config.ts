import { inject, type App, type InjectionKey } from 'vue'

export type CommunityConfig = {
  showLicense: boolean
  showTutorialsEntry: boolean
}

const communityConfigKey: InjectionKey<CommunityConfig> = Symbol('community-config')

export function provideCommunityConfig(app: App, config: CommunityConfig) {
  app.provide(communityConfigKey, config)
}

export function useCommunityConfig() {
  const config = inject(communityConfigKey)
  if (config == null) throw new Error('Community config is not provided')
  return config
}
