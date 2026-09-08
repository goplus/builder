import type { Component } from 'vue'
import type { TutorialProjectConfig } from '@/models/tutorial/project'
import SpxProjectEditorHost from './SpxProjectEditorHost.vue'

export type TutorialProjectType = TutorialProjectConfig['project']['type']

/** Editor hosts keyed by the type of the embedded learner project. Only spx projects are supported so far. */
const projectEditorHosts: Record<TutorialProjectType, Component> = {
  spx: SpxProjectEditorHost
}

export function getProjectEditorHost(type: TutorialProjectType): Component {
  // `type` comes from the course's `index.json`, so guard against values the registry does not know.
  const host = projectEditorHosts[type]
  if (host == null) throw new Error(`unsupported project type: ${type}`)
  return host
}
