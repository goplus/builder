import { Cancelled, capture } from '@/utils/exception'
import { ArtStyle, Perspective, SpriteCategory } from '@/apis/common'
import type { ProjectSettings, SpriteSettings } from '@/apis/aigc'
import type { Project } from '../project'
import type { Sprite } from '../sprite'

export function getProjectSettings(project: Project): ProjectSettings {
  return {
    name: project.name ?? 'TODO',
    description: project.description ?? 'TODO',
    artStyle: project.extraSettings?.artStyle ?? ArtStyle.Unspecified,
    perspective: project.extraSettings?.perspective ?? Perspective.Unspecified
  }
}

export function getSpriteSettings(sprite: Sprite): SpriteSettings {
  const extraSettings = sprite.assetMetadata?.extraSettings ?? null
  return {
    name: sprite.name ?? 'TODO',
    category: (extraSettings?.category as SpriteCategory | undefined) ?? SpriteCategory.Unspecified,
    description: sprite.assetMetadata?.description ?? 'TODO',
    artStyle: extraSettings?.artStyle ?? ArtStyle.Unspecified,
    perspective: extraSettings?.perspective ?? Perspective.Unspecified
  }
}

export type PhaseState<R> =
  | {
      state: 'initial'
      result?: null
      error?: null
    }
  | {
      state: 'running'
      result?: null
      error?: null
    }
  | {
      state: 'finished'
      result: R
      error?: null
    }
  | {
      state: 'failed'
      result?: null
      error: unknown
    }

export class Phase<R> {
  state: PhaseState<R>
  constructor() {
    this.state = { state: 'initial' }
  }
  async run(promise: Promise<R>): Promise<R> {
    this.state = { state: 'running' }
    try {
      const result = await promise
      this.state = { state: 'finished', result }
      return result
    } catch (err) {
      if (err instanceof Cancelled) {
        this.state = { state: 'initial' }
      } else {
        this.state = { state: 'failed', error: err }
        capture(err)
      }
      throw err
    }
  }
}
