/**
 * @desc SpxSnippetVariablesProvider — spx-specific snippet variables provider.
 */

import type { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import { Stage } from '@/models/spx/stage'
import { packageSpx } from '@/utils/spx'
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

  private getPropertiesTarget(textDocument: SnippetVariablesContext['textDocument']): string | null {
    if (textDocument == null) return null
    const currentResourceId = textDocumentId2ResourceId(textDocument.id, this.project)
    const currentResourceModel = currentResourceId != null ? getResourceModel(this.project, currentResourceId) : null
    if (currentResourceModel instanceof Stage) return ''
    if (currentResourceModel instanceof Sprite) return currentResourceModel.name
    return null
  }

  private getPropertyPriority(property: Property): number {
    const pkg = property.definition.package
    const isField = property.kind === 'field'
    if (pkg === 'main') return isField ? 0 : 1
    if (pkg === packageSpx) return isField ? 2 : 3
    // fallback for unknown packages
    return isField ? 4 : 5
  }

  private pickPreferredProperty(properties: Property[]): Property | null {
    let candidate: Property | null = null
    let bestPriority = Number.POSITIVE_INFINITY
    for (const property of properties) {
      const priority = this.getPropertyPriority(property)
      if (priority < bestPriority) {
        candidate = property
        bestPriority = priority
      }
    }
    return candidate
  }

  private async getPreferredPropertyName(ctx: SnippetVariablesContext, signal?: AbortSignal): Promise<string | null> {
    const target = this.getPropertiesTarget(ctx.textDocument)
    if (target == null || this.loadProperties == null) return null
    const properties = await this.loadProperties(target, signal)
    signal?.throwIfAborted()
    return this.pickPreferredProperty(properties)?.name ?? null
  }

  async provideSnippetVariables(
    ctx: SnippetVariablesContext,
    requestedVariables: readonly string[],
    signal?: AbortSignal
  ): Promise<Record<string, string | null>> {
    if (requestedVariables.length === 0) return {}
    const requested = new Set(requestedVariables)

    const project = this.project
    const stage = project.stage
    const currentResourceId = ctx.textDocument != null ? textDocumentId2ResourceId(ctx.textDocument.id, project) : null
    const currentResourceModel = currentResourceId != null ? getResourceModel(project, currentResourceId) : null
    const currentSprite = currentResourceModel instanceof Sprite ? currentResourceModel : null
    const otherSprite = project.sprites.find((sprite) => sprite !== currentSprite)
    const firstWidget = stage.widgets[0]
    const result: Record<string, string | null> = {}

    if (requested.has('BUILDER_OTHER_SPRITE_NAME')) {
      result.BUILDER_OTHER_SPRITE_NAME = this.escapeString(otherSprite?.name)
    }
    if (requested.has('BUILDER_FIRST_COSTUME_NAME')) {
      result.BUILDER_FIRST_COSTUME_NAME = this.escapeString(currentSprite?.costumes[0]?.name)
    }
    if (requested.has('BUILDER_FIRST_ANIMATION_NAME')) {
      result.BUILDER_FIRST_ANIMATION_NAME = this.escapeString(currentSprite?.animations[0]?.name)
    }
    if (requested.has('BUILDER_FIRST_BACKDROP_NAME')) {
      result.BUILDER_FIRST_BACKDROP_NAME = this.escapeString(stage.backdrops[0]?.name)
    }
    if (requested.has('BUILDER_FIRST_SOUND_NAME')) {
      result.BUILDER_FIRST_SOUND_NAME = this.escapeString(project.sounds[0]?.name)
    }
    if (requested.has('BUILDER_FIRST_WIDGET_TYPE')) {
      result.BUILDER_FIRST_WIDGET_TYPE = this.adaptWidgetType(firstWidget?.type)
    }
    if (requested.has('BUILDER_FIRST_WIDGET_NAME')) {
      result.BUILDER_FIRST_WIDGET_NAME = this.escapeString(firstWidget?.name)
    }
    if (requested.has('BUILDER_FIRST_PROPERTY_NAME')) {
      const firstPropertyName = await this.getPreferredPropertyName(ctx, signal)
      result.BUILDER_FIRST_PROPERTY_NAME = this.escapeString(firstPropertyName)
    }
    return result
  }
}
