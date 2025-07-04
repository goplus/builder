<template>
  <slot></slot>
</template>

<script lang="ts">
import { inject } from 'vue'
import type { EditorState } from './editor-state'

export type EditorCtx = {
  project: Project
  state: EditorState
}

const editorCtxKey: InjectionKey<EditorCtx> = Symbol('editor-ctx')

export function useEditorCtx() {
  const ctx = inject(editorCtxKey)
  if (ctx == null) throw new Error('useEditorCtx should be called inside of editor')
  return ctx
}
</script>

<script setup lang="ts">
import { provide, type InjectionKey } from 'vue'
import { Project } from '@/models/project'
import { computedShallowReactive } from '@/utils/utils'

const props = defineProps<{
  project: Project
  state: EditorState
}>()

const editorCtx = computedShallowReactive<EditorCtx>(() => ({
  project: props.project,
  state: props.state
}))

provide(editorCtxKey, editorCtx)
</script>
