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
  type ResourceReferencesContext
} from './ui'
import { DefinitionKind, type DefinitionDocumentationItem, type Diagnostic } from './common'
import * as spxDocumentationItems from './document-base/spx'
import * as gopDocumentationItems from './document-base/gop'

// mock data for test
const allIds = Object.values({
  ...spxDocumentationItems,
  ...gopDocumentationItems
}).map((item) => item.definition)

const editorCtx = useEditorCtx()

function handleUIInit(ui: ICodeEditorUI) {
  const copilot = new Copilot()
  const documentBase = new DocumentBase()
  const spxlc = new Spxlc()

  ui.registerAPIReferenceProvider({
    async provideAPIReference(ctx, position) {
      console.warn('TODO: get api references from LS', ctx, position, spxlc)
      await new Promise<void>((resolve) => setTimeout(resolve, 100))
      const documentations = (await Promise.all(allIds.map((id) => documentBase.getDocumentation(id)))).filter(
        () => Math.random() > 0.4
      )
      return documentations as DefinitionDocumentationItem[]
    }
  })

  ui.registerCompletionProvider({
    async provideCompletion(ctx, position) {
      console.warn('TODO', ctx, position)
      return [
        {
          label: 'onStart',
          kind: DefinitionKind.Listen,
          detail: 'func onStart(callback func())',
          documentation: {
            value: `documentation for \`onStart\``
          }
        },
        {
          label: 'setXYpos',
          kind: DefinitionKind.Function,
          detail: 'func Sprite.setXYpos(x, y int)',
          documentation: {
            value: `documentation for \`setXYpos\``
          }
        }
      ]
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

  // test copilot chat
  // TODO: remove me
  //   ui.executeCommxplainKind.CodeSegment,
  //       codeSegment: {
  //         textDocument: {
  //           uri: 'file:///NiuXiaoQi.spx'
  //         },
  //         range: {
  //           start: {
  //             line: 1,
  //             column: 1
  //           },
  //           end: {
  //             line: 1,
  //             column: 2
  //           }
  //         },
  //         content: `onClick => {
  //     println "clicked"
  // }`
  //       }
  //     }
  //   })

  class DiagnosticsProvider
    extends Emitter<{
      didChangeDiagnostics: []
    }>
    implements IDiagnosticsProvider
  {
    async provideDiagnostics(ctx: DiagnosticsContext): Promise<Diagnostic[]> {
      console.warn('TODO', ctx, editorCtx.runtime)
      return []
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
      const range = ctx.textDocument.getDefaultRange(position)
      let value = ctx.textDocument.getValueInRange(range)
      if (value === '') {
        value = ctx.textDocument.getValueInRange({
          start: position,
          end: {
            line: position.line,
            column: position.column + 1
          }
        })
      }
      return {
        contents: [{ value: '`' + value + '` hovered' }],
        actions: []
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
