import { inject, ref, type App, type InjectionKey, type Ref } from 'vue'

export type ProjectConfig = {
  defaultFontPreferences: string[]
  rulerVisible?: Ref<boolean>
}

type ResolvedProjectConfig = Required<ProjectConfig>

const projectConfigKey: InjectionKey<ResolvedProjectConfig> = Symbol('project-config')

export function provideProjectConfig(app: App, config: ProjectConfig) {
  app.provide(projectConfigKey, { rulerVisible: ref(false), ...config })
}

export function useProjectConfig() {
  const config = inject(projectConfigKey)
  if (config == null) throw new Error('project config not provided')
  return config
}
