import type { Files } from '@/models/common/file'
import type { Disposer } from '@/utils/disposable'

/** A skill bundle represented as an fs-like collection of files. */
export type SkillBundle = {
  /** Files included in the skill bundle. See details about `Files` in `@/models/common/file.ts`. */
  files: Files
}

/** Metadata exposed in the skill catalog and shared by loaded skill documents. */
export type SkillManifestItem = {
  /** Name of the skill. See details in https://agentskills.io/specification#name-field */
  name: string
  /** Description of the skill. See details in https://agentskills.io/specification#description-field */
  description: string
}

/** The parsed main skill document together with its catalog metadata and available resource paths. */
export type LoadedSkillDocument = SkillManifestItem & {
  /** The content of the main skill document (`SKILL.md`). See details in https://agentskills.io/specification#body-content */
  instructions: string
  /**
   * Relative paths of other files included in the skill bundle, excluding `SKILL.md`.
   * Only the currently supported resource files are exposed here.
   */
  resourcePaths: string[]
}

/** Registry interface for skill bundle registration, discovery, and document loading. */
export interface SkillRegistry {
  /** Register a skill bundle to the registry. Returns a disposer to unregister the bundle. */
  register(bundle: SkillBundle): Disposer
  /** List all available skills in the registry. */
  list(): Promise<SkillManifestItem[]>
  /** Load the main skill document (`SKILL.md`) with the given skill name. */
  load(name: string): Promise<LoadedSkillDocument>
  /** Load a resource file with the given skill name and relative resource path. */
  loadResource(name: string, resourcePath: string): Promise<string>
}
