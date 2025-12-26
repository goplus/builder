import { ActionException, Cancelled, capture } from '@/utils/exception'
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
      status: 'initial'
      result?: null
      error?: null
    }
  | {
      status: 'running'
      result?: null
      error?: null
    }
  | {
      status: 'finished'
      result: R
      error?: null
    }
  | {
      status: 'failed'
      result?: null
      error: ActionException
    }

export class Phase<R> {
  state: PhaseState<R>
  constructor() {
    this.state = { status: 'initial' }
  }
  async run(promise: Promise<R>): Promise<R> {
    this.state = { status: 'running' }
    try {
      const result = await promise
      this.state = { status: 'finished', result }
      return result
    } catch (err) {
      if (err instanceof Cancelled) {
        this.state = { status: 'initial' }
      } else {
        const ae = new ActionException(err, {
          en: 'TODO: phase failed',
          zh: 'TODO: 阶段失败'
        })
        this.state = { status: 'failed', error: ae }
        capture(err)
      }
      throw err
    }
  }
}
