/**
 * Registry of Project Editor hosts for the learner project embedded in a course.
 * `CourseEditor.vue` does not know which editor to render for the embedded project; it asks this module by the
 * `type` declared in the course's `index.json` (`TutorialProjectConfig.project.type`) and mounts the returned
 * component with `<component :is>`. Supporting another project type means adding a host component here (and to the
 * `type` union in `models/tutorial/project.ts`), nothing else in the Course Editor changes.
 */
import type { Component } from 'vue'
import type { TutorialProjectConfig } from '@/models/tutorial/project'
import SpxProjectEditorHost from './SpxProjectEditorHost.vue'

/**
 * The union of embedded-project types the Course Editor can host, derived from the config type so it cannot drift
 * from what `index.json` may declare (`'spx'` today). Used as the key type of `projectEditorHosts` and as the
 * parameter type of `getProjectEditorHost`.
 */
export type TutorialProjectType = TutorialProjectConfig['project']['type']

/**
 * Editor hosts keyed by the type of the embedded learner project. Only spx projects are supported so far.
 * Every host must accept the props `CourseEditor.vue` passes (`project`, `rootPath`, `initialPath`, `active`) and
 * emit `update:editorState`; see `SpxProjectEditorHost.vue` for the contract.
 * Read by `getProjectEditorHost`; written by nobody at runtime (module constant, built once at module load).
 */
const projectEditorHosts: Record<TutorialProjectType, Component> = {
  spx: SpxProjectEditorHost
}

/**
 * Resolve the host component that edits an embedded project of the given type.
 * @param type - The project type from the loaded course config (`TutorialProjectConfig.project.type`).
 * @returns The Vue component to mount for that type (currently always `SpxProjectEditorHost`).
 * @throws Error `unsupported project type: <type>` when the registry has no host for `type`; the caller's
 * `computed` propagates it, so an unknown type fails loudly instead of rendering nothing.
 * Called by: components/course-editor/CourseEditor.vue#projectEditorHost (computed)
 */
export function getProjectEditorHost(type: TutorialProjectType): Component {
  // `type` comes from the course's `index.json`, so guard against values the registry does not know.
  // The `Record` type promises a host for every union member, but the JSON is not validated against the union.
  const host = projectEditorHosts[type]
  if (host == null) throw new Error(`unsupported project type: ${type}`)
  return host
}
