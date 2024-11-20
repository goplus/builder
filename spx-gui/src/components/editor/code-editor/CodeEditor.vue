<script setup lang="ts">
import { computed } from 'vue'
import Emitter from '@/utils/emitter'
import { useEditorCtx } from '../EditorContextProvider.vue'
import { Copilot } from './copilot'
import { DocumentBase } from './document-base'
import { Spxlc } from './lsp'
import { Runtime } from './runtime'
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

const editorCtx = useEditorCtx()

function initialize(ui: ICodeEditorUI) {
  const copilot = new Copilot()
  const documentBase = new DocumentBase()
  const spxlc = new Spxlc()
  const runtime = new Runtime()

  ui.registerAPIReferenceProvider({
    async provideAPIReference(ctx, position) {
      console.warn('TODO', ctx, position, documentBase, spxlc)
      return []
    }
  })

  ui.registerCompletionProvider({
    async provideCompletion(ctx, position) {
      console.warn('TODO', ctx, position)
      return []
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
      console.warn('TODO', ctx, runtime)
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
      return null
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
  <CodeEditorUIComp :key="editorKey" :project="editorCtx.project" @initialize="initialize" />
</template>
