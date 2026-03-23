/**
 * @desc SpxSnippetVariablesProvider — spx-specific snippet variables provider.
 */

import type { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import type { ISnippetVariablesProvider, SnippetVariablesContext } from '../xgo-code-editor'
import { getResourceModel, textDocumentId2ResourceId } from './common'

export class SpxSnippetVariablesProvider implements ISnippetVariablesProvider {
  constructor(private project: SpxProject) {}

  private adaptWidgetType(type: string | null | undefined): string | null {
    if (type == null) return null
    const widgetTypeMap: Record<string, string> = { monitor: 'Monitor' }
    const widgetType = widgetTypeMap[type]
    if (widgetType != null) return widgetType
    throw new Error(`Unsupported widget type: ${type}`)
  }

  private escapeString(str: string | null | undefined): string | null {
    if (str == null) return null
    return JSON.stringify(str).slice(1, -1)
  }

  provideSnippetVariables(ctx: SnippetVariablesContext): Record<string, string | null> {
    const project = this.project
    const stage = project.stage
    const currentResourceId = ctx.textDocument != null ? textDocumentId2ResourceId(ctx.textDocument.id, project) : null
    const currentResourceModel = currentResourceId != null ? getResourceModel(project, currentResourceId) : null
    const currentSprite = currentResourceModel instanceof Sprite ? currentResourceModel : null
    const otherSprite = project.sprites.find((sprite) => sprite !== currentSprite)
    const firstWidget = stage.widgets[0]
    return {
      BUILDER_OTHER_SPRITE_NAME: this.escapeString(otherSprite?.name),
      BUILDER_FIRST_COSTUME_NAME: this.escapeString(currentSprite?.costumes[0]?.name),
      BUILDER_FIRST_ANIMATION_NAME: this.escapeString(currentSprite?.animations[0]?.name),
      BUILDER_FIRST_BACKDROP_NAME: this.escapeString(stage.backdrops[0]?.name),
      BUILDER_FIRST_SOUND_NAME: this.escapeString(project.sounds[0]?.name),
      BUILDER_FIRST_WIDGET_TYPE: this.adaptWidgetType(firstWidget?.type),
      BUILDER_FIRST_WIDGET_NAME: this.escapeString(firstWidget?.name)
    }
  }
}
