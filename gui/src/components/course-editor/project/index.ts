/**
 * Project Editor hosts for the learner project embedded in a course, by project type. Supporting another type means
 * adding a host here and to the `type` union in `models/tutorial/project.ts`.
 */
import type { Component } from 'vue'
import type { TutorialProjectConfig } from '@/models/tutorial/project'
import SpxProjectEditorHost from './SpxProjectEditorHost.vue'

export type TutorialProjectType = TutorialProjectConfig['project']['type']

/** Every host takes the same props and emits as `SpxProjectEditorHost`. */
const projectEditorHosts: Record<TutorialProjectType, Component> = {
  spx: SpxProjectEditorHost
}

export function getProjectEditorHost(type: TutorialProjectType): Component {
  // The `Record` type promises a host for every type, but `type` comes from the course's `index.json`, which is not
  // validated against the union.
  const host = projectEditorHosts[type]
  if (host == null) throw new Error(`unsupported project type: ${type}`)
  return host
}
