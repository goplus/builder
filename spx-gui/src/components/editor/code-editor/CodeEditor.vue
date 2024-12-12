<script setup lang="ts">
import Emitter from '@/utils/emitter'
import { useEditorCtx } from '../EditorContextProvider.vue'
import { Copilot } from './copilot'
import { DocumentBase } from './document-base'
import { Spxlc } from './lsp'
import {
  CodeEditorUIComp,
  type ICodeEditorUI,
  type DiagnosticsContext,
  type IDiagnosticsProvider,
  type IResourceReferencesProvider,
  type ResourceReference,
  type ResourceReferencesContext,
  builtInCommandCopilotExplain,
  ChatExplainKind,
  type ChatExplainTargetCodeSegment,
  builtInCommandCopilotReview,
  type ChatTopicReview,
  builtInCommandGoToDefinition
} from './ui'
import {
  makeBasicMarkdownString,
  type Action,
  type DefinitionDocumentationItem,
  type DefinitionDocumentationString,
  type DefinitionIdentifier,
  type Diagnostic,
  makeAdvancedMarkdownString,
  stringifyDefinitionId,
  DiagnosticSeverity,
  ResourceReferenceKind,
  selection2Range
} from './common'
import * as spxDocumentationItems from './document-base/spx'
import * as gopDocumentationItems from './document-base/gop'

// mock data for test
const allItems = Object.values({
  ...spxDocumentationItems,
  ...gopDocumentationItems
})
const allIds = allItems.map((item) => item.definition)

const editorCtx = useEditorCtx()

function handleUIInit(ui: ICodeEditorUI) {
  const copilot = new Copilot()
  const documentBase = new DocumentBase()
  const spxlc = new Spxlc()

  ui.registerAPIReferenceProvider({
    async provideAPIReference(ctx, position) {
      console.warn('TODO: get api references from LS', ctx, position, spxlc)
      await new Promise<void>((resolve) => setTimeout(resolve, 100))
      ctx.signal.throwIfAborted()
      const documentations = (await Promise.all(allIds.map((id) => documentBase.getDocumentation(id)))).filter(
        () => Math.random() > 0.4
      )
      return documentations as DefinitionDocumentationItem[]
    }
  })

  ui.registerCompletionProvider({
    async provideCompletion(ctx, position) {
      console.warn('TODO', ctx, position)
      await new Promise<void>((resolve) => setTimeout(resolve, 100))
      ctx.signal.throwIfAborted()
      return allItems.map((item) => ({
        label: item.definition
          .name!.split('.')
          .pop()!
          .replace(/^./, (c) => c.toLowerCase()),
        kind: item.kind,
        insertText: item.insertText,
        documentation: makeAdvancedMarkdownString(`
<definition-overview-wrapper>${item.overview}</definition-overview-wrapper>
<definition-detail def-id="${stringifyDefinitionId(item.definition)}"></definition-detail>
`)
      }))
    }
  })

  ui.registerContextMenuProvider({
    async provideContextMenu({ textDocument }, position) {
      const word = textDocument.getWordAtPosition(position)
      if (word == null) return []
      const wordStart = { ...position, column: word.startColumn }
      const wordEnd = { ...position, column: word.endColumn }
      const explainTarget: ChatExplainTargetCodeSegment = {
        kind: ChatExplainKind.CodeSegment,
        codeSegment: {
          // TODO: use definition info from LS and explain definition instead of code-segment
          textDocument: textDocument.id,
          range: { start: wordStart, end: wordEnd },
          content: word.word
        }
      }
      return [
        {
          command: builtInCommandCopilotExplain,
          arguments: [explainTarget]
        }
      ]
    },
    async provideSelectionContextMenu({ textDocument }, selection) {
      const range = selection2Range(selection)
      const code = textDocument.getValueInRange(range)
      const explainTarget: ChatExplainTargetCodeSegment = {
        kind: ChatExplainKind.CodeSegment,
        codeSegment: {
          textDocument: textDocument.id,
          range,
          content: code
        }
      }
      const reviewTarget: Omit<ChatTopicReview, 'kind'> = {
        textDocument: textDocument.id,
        range,
        code
      }
      return [
        {
          command: builtInCommandCopilotExplain,
          arguments: [explainTarget]
        },
        {
          command: builtInCommandCopilotReview,
          arguments: [reviewTarget]
        }
      ]
    }
  })

  ui.registerCopilot(copilot)

  class DiagnosticsProvider
    extends Emitter<{
      didChangeDiagnostics: []
    }>
    implements IDiagnosticsProvider
  {
    async provideDiagnostics(ctx: DiagnosticsContext): Promise<Diagnostic[]> {
      console.warn('TODO', ctx, editorCtx.runtime)
      await new Promise<void>((resolve) => setTimeout(resolve, 100))
      ctx.signal.throwIfAborted()
      const diagnostics: Diagnostic[] = []
      const value = ctx.textDocument.getValue()
      const errIdx = value.indexOf('err')
      if (errIdx >= 0) {
        diagnostics.push({
          range: {
            start: ctx.textDocument.getPositionAt(errIdx),
            end: ctx.textDocument.getPositionAt(errIdx + 3)
          },
          severity: DiagnosticSeverity.Error,
          message: 'This is an error'
        })
      }
      const warningIdx = value.indexOf('warn')
      if (warningIdx >= 0) {
        diagnostics.push({
          range: {
            start: ctx.textDocument.getPositionAt(warningIdx),
            end: ctx.textDocument.getPositionAt(warningIdx + 4)
          },
          severity: DiagnosticSeverity.Warning,
          message: 'This is a warning'
        })
      }
      return diagnostics
    }
  }

  ui.registerDiagnosticsProvider(new DiagnosticsProvider())

  ui.registerFormattingEditProvider({
    async provideDocumentFormattingEdits(ctx) {
      console.warn('TODO', ctx)
      return []
    }
  })

  ui.registerHoverProvider({
    async provideHover(ctx, position) {
      console.warn('TODO', ctx, position)
      await new Promise<void>((resolve) => setTimeout(resolve, 100))
      ctx.signal.throwIfAborted()
      const range = ctx.textDocument.getDefaultRange(position)
      let value = ctx.textDocument.getValueInRange(range)
      if (value.trim() === '') return null
      const methodName = value[0].toUpperCase() + value.slice(1)
      // TODO: get definition ID from LS
      const definitionID: DefinitionIdentifier = {
        package: 'github.com/goplus/spx',
        name: `Sprite.${methodName}`
      }
      const definition = await documentBase.getDocumentation(definitionID)
      const contents: DefinitionDocumentationString[] = []
      const actions: Action[] = []
      if (definition != null) {
        contents.push(
          makeAdvancedMarkdownString(`
<definition-overview-wrapper>${definition.overview}</definition-overview-wrapper>
<definition-detail def-id="${stringifyDefinitionId(definition.definition)}"></definition-detail>
`)
        )
        actions.push({
          command: builtInCommandCopilotExplain,
          arguments: [
            {
              kind: ChatExplainKind.Definition,
              overview: definition.overview,
              definition: definition.definition
            }
          ]
        })
      }
      if (value === 'time') {
        contents.push(
          makeBasicMarkdownString(`<definition-overview-wrapper>var time int</definition-overview-wrapper>`)
        )
        actions.push({
          command: builtInCommandGoToDefinition,
          arguments: [
            {
              textDocument: {
                uri: `file:///main.spx`
              },
              position: {
                line: 2,
                column: 2
              }
            }
          ]
        })
      }
      if (contents.length === 0) return null
      return {
        contents,
        actions
      }
    }
  })

  class ResourceReferencesProvider
    extends Emitter<{
      didChangeResourceReferences: []
    }>
    implements IResourceReferencesProvider
  {
    async provideResourceReferences(ctx: ResourceReferencesContext): Promise<ResourceReference[]> {
      console.warn('TODO', ctx)
      await new Promise<void>((resolve) => setTimeout(resolve, 100))
      ctx.signal.throwIfAborted()
      const rrs: ResourceReference[] = []
      const value = ctx.textDocument.getValue()
      editorCtx.project.sounds
        .map((s) => s.name)
        .forEach((soundName) => {
          const idx = value.indexOf(`"${soundName}"`)
          if (idx >= 0) {
            rrs.push({
              kind: ResourceReferenceKind.StringLiteral,
              range: {
                start: ctx.textDocument.getPositionAt(idx),
                end: ctx.textDocument.getPositionAt(idx + soundName.length + 2)
              },
              resource: {
                uri: `spx://resources/sounds/${soundName}`
              }
            })
          }
        })
      editorCtx.project.sprites
        .map((s) => s.name)
        .forEach((spriteName) => {
          const idx = value.indexOf(`"${spriteName}"`)
          if (idx >= 0) {
            rrs.push({
              kind: ResourceReferenceKind.StringLiteral,
              range: {
                start: ctx.textDocument.getPositionAt(idx),
                end: ctx.textDocument.getPositionAt(idx + spriteName.length + 2)
              },
              resource: {
                uri: `spx://resources/sprites/${spriteName}`
              }
            })
          }
        })
      editorCtx.project.stage.backdrops
        .map((b) => b.name)
        .forEach((backdropName) => {
          const idx = value.indexOf(`"${backdropName}"`)
          if (idx >= 0) {
            rrs.push({
              kind: ResourceReferenceKind.StringLiteral,
              range: {
                start: ctx.textDocument.getPositionAt(idx),
                end: ctx.textDocument.getPositionAt(idx + backdropName.length + 2)
              },
              resource: {
                uri: `spx://resources/backdrops/${backdropName}`
              }
            })
          }
        })
      editorCtx.project.stage.widgets
        .map((w) => w.name)
        .forEach((widgetName) => {
          const idx = value.indexOf(`"${widgetName}"`)
          if (idx >= 0) {
            rrs.push({
              kind: ResourceReferenceKind.StringLiteral,
              range: {
                start: ctx.textDocument.getPositionAt(idx),
                end: ctx.textDocument.getPositionAt(idx + widgetName.length + 2)
              },
              resource: {
                uri: `spx://resources/widgets/${widgetName}`
              }
            })
          }
        })
      const sprite = editorCtx.project.sprites[0]
      sprite.animations
        .map((a) => a.name)
        .forEach((animationName) => {
          const idx = value.indexOf(`"${animationName}"`)
          if (idx >= 0) {
            rrs.push({
              kind: ResourceReferenceKind.StringLiteral,
              range: {
                start: ctx.textDocument.getPositionAt(idx),
                end: ctx.textDocument.getPositionAt(idx + animationName.length + 2)
              },
              resource: {
                uri: `spx://resources/sprites/${sprite.name}/animations/${animationName}`
              }
            })
          }
        })
      sprite.costumes
        .map((c) => c.name)
        .forEach((costumeName) => {
          const idx = value.indexOf(`"${costumeName}"`)
          if (idx >= 0) {
            rrs.push({
              kind: ResourceReferenceKind.StringLiteral,
              range: {
                start: ctx.textDocument.getPositionAt(idx),
                end: ctx.textDocument.getPositionAt(idx + costumeName.length + 2)
              },
              resource: {
                uri: `spx://resources/sprites/${sprite.name}/costumes/${costumeName}`
              }
            })
          }
        })
      const irrIdx = value.indexOf(sprite.name + ' ')
      if (irrIdx >= 0) {
        rrs.push({
          kind: ResourceReferenceKind.AutoBinding,
          range: {
            start: ctx.textDocument.getPositionAt(irrIdx),
            end: ctx.textDocument.getPositionAt(irrIdx + 9)
          },
          resource: {
            uri: `spx://resources/sprites/${sprite.name}`
          }
        })
      }
      return rrs
    }
  }

  ui.registerResourceReferencesProvider(new ResourceReferencesProvider())
  ui.registerDocumentBase(documentBase)
}

defineExpose({
  async format() {
    console.warn('TODO')
  }
})
</script>

<template>
  <CodeEditorUIComp :project="editorCtx.project" @init="handleUIInit" />
</template>
