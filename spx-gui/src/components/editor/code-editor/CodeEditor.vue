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
  ChatExplainKind
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
  DiagnosticSeverity
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
        documentation: item.detail
      }))
    }
  })

  ui.registerContextMenuProvider({
    async provideContextMenu(ctx, position) {
      console.warn('TODO', ctx, position)
      return []
    },
    async provideSelectionContextMenu(ctx, selection) {
      console.warn('TODO', ctx, selection)
      return []
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
          title: 'Explain',
          command: builtInCommandCopilotExplain,
          arguments: [
            {
              kind: ChatExplainKind.Definition,
              overview: definition.overview,
              definition: definition.definition
            }
          ]
        })
      } else {
        contents.push(makeBasicMarkdownString(`<definition-overview-wrapper>${value}</definition-overview-wrapper>`))
      }
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
      return []
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
