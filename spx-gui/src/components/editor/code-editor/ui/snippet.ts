/**
 * @file Snippet Parser
 * @desc This class is responsible for parsing snippets and resolving Builder built-in variables.
 */

import { computed } from 'vue'
import { SnippetParser as BaseSnippetParser, Text, Variable } from '@/utils/snippet-parser'
import { Sprite } from '@/models/sprite'
import type { WidgetType } from '@/models/widget'
import type { Project } from '@/models/project'
import { textDocumentId2ResourceModelId } from '../common'
import type { CodeEditorUI } from './code-editor-ui'

export class SnippetParser {
  constructor(
    private project: Project,
    private ui: CodeEditorUI
  ) {}

  private parser = new BaseSnippetParser()

  /** Convert the widget type to a string representation in spx code */
  private adaptWidgetType(type: WidgetType | undefined) {
    if (type == null) return undefined
    if (type === 'monitor') return 'Monitor'
    throw new Error(`Unsupported widget type: ${type}`)
  }

  /** Escapes special characters in a string to make it safe for string literal concatenation */
  private escapeString(str: string | undefined) {
    if (str == null) return undefined
    return JSON.stringify(str).slice(1, -1)
  }

  /** Builder built-in variables */
  private builderVariables = computed<Record<string, string | undefined>>(() => {
    const project = this.project
    const stage = project.stage
    const currentTextDocumentId = this.ui.activeTextDocument?.id
    const currentResourceModelId =
      currentTextDocumentId != null ? textDocumentId2ResourceModelId(currentTextDocumentId, project) : null
    const currentResourceModel =
      currentResourceModelId != null ? project.getResourceModel(currentResourceModelId) : null
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
  })

  private getVariableDefaultValue(variable: Variable) {
    if (variable.children.length === 0) return undefined
    const child = variable.children[0]
    if (!(child instanceof Text)) return undefined
    return child.toString()
  }

  /** Parse given snippet string & resolve Builder built-in variables */
  parse(snippet: string) {
    const parsed = this.parser.parse(snippet)
    parsed.resolveVariables({
      resolve: (variable) => this.builderVariables.value[variable.name] ?? this.getVariableDefaultValue(variable)
    })
    return parsed
  }
}
