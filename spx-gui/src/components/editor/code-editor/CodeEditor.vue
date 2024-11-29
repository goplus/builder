<script setup lang="ts">
import { computed } from 'vue'
import Emitter from '@/utils/emitter'
import { useEditorCtx } from '../EditorContextProvider.vue'
import { Copilot } from './copilot'
import { DocumentBase } from './document-base'
import { Spxlc } from './lsp'
import {
  CodeEditorUIComp,
  type ICodeEditorUI,
  type Diagnostic,
  type DiagnosticsContext,
  type IDiagnosticsProvider,
  type IResourceReferencesProvider,
  type ResourceReference,
  type ResourceReferencesContext
} from './ui'
import { DefinitionKind, type DefinitionDocumentationItem, type DefinitionIdentifier } from './common'

const editorCtx = useEditorCtx()

function handleUIInit(ui: ICodeEditorUI) {
  const copilot = new Copilot()
  const documentBase = new DocumentBase()
  const spxlc = new Spxlc()

  ui.registerAPIReferenceProvider({
    async provideAPIReference(ctx, position) {
      console.warn('TODO: get api references from LS', ctx, position, spxlc)
      const ids: DefinitionIdentifier[] = [
        { package: 'github.com/goplus/spx', name: 'onStart' },
        { package: 'github.com/goplus/spx', name: 'Sprite.setXYpos' },
        { name: 'for_iterate (TODO)' }
      ]
      const documentations = await Promise.all(ids.map((id) => documentBase.getDocumentation(id)))
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

const editorKey = computed(() => {
  const selected = editorCtx.project.selected
  if (selected?.type === 'stage') return 'stage'
  if (selected?.type === 'sprite') return `sprite:${selected.id}`
  return ''
})

defineExpose({
  async format() {
    console.warn('TODO')
  }
})
</script>

<template>
  <CodeEditorUIComp :key="editorKey" :project="editorCtx.project" @init="handleUIInit" />
</template>
