/**
 * @desc SpxSnippetVariablesProvider — spx-specific snippet variables provider.
 */

import { ref } from 'vue'
import type { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import { Stage } from '@/models/spx/stage'
import type { ISnippetVariablesProvider, Property, SnippetVariablesContext } from '../xgo-code-editor'
import { getResourceModel, textDocumentId2ResourceId } from './common'

type PropertyLoader = (target: string, signal?: AbortSignal) => Promise<Property[]>

export class SpxSnippetVariablesProvider implements ISnippetVariablesProvider {
  constructor(private project: SpxProject) {}

  private loadProperties: PropertyLoader | null = null

  setPropertiesLoader(loader: PropertyLoader) {
    this.loadProperties = loader
  }

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

  private firstPropertyName = ref<string | null>(null)

  clearProperties() {
    this.firstPropertyName.value = null
  }

  private getPropertiesTarget(textDocument: SnippetVariablesContext['textDocument']): string | null {
    if (textDocument == null) return null
    const currentResourceId = textDocumentId2ResourceId(textDocument.id, this.project)
    const currentResourceModel = currentResourceId != null ? getResourceModel(this.project, currentResourceId) : null
    if (currentResourceModel instanceof Stage) return ''
    if (currentResourceModel instanceof Sprite) return currentResourceModel.name
    return null
  }

  async refreshForTextDocument(ctx: SnippetVariablesContext, signal?: AbortSignal): Promise<void> {
    const target = this.getPropertiesTarget(ctx.textDocument)
    if (target == null || this.loadProperties == null) {
      this.clearProperties()
      return
    }
    const properties = await this.loadProperties(target, signal)
    signal?.throwIfAborted()
    this.firstPropertyName.value = properties[0]?.name ?? null
  }

  provideSnippetVariables(ctx: SnippetVariablesContext): Record<string, string | null> {
    const project = this.project
    const stage = project.stage
    const firstPropertyName = this.firstPropertyName.value
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
      BUILDER_FIRST_WIDGET_NAME: this.escapeString(firstWidget?.name),
      BUILDER_FIRST_PROPERTY_NAME: this.escapeString(firstPropertyName)
    }
  }
}
