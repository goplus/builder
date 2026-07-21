import { inject, type App, type InjectionKey } from 'vue'

export type ProjectConfig = {
  defaultFontPreferences: string[]
}

const projectConfigKey: InjectionKey<ProjectConfig> = Symbol('project-config')

export function provideProjectConfig(app: App, config: ProjectConfig) {
  app.provide(projectConfigKey, config)
}

export function useProjectConfig() {
  const config = inject(projectConfigKey)
  if (config == null) throw new Error('project config not provided')
  return config
}
