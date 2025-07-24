<template>
  <slot></slot>
</template>

<script lang="ts">
import { useAppProvide, useAppInject } from '@/utils/app-state'
import type { EditorState } from './editor-state'

export type EditorCtx = {
  project: Project
  state: EditorState
}

const editorCtxKey: InjectionKey<EditorCtx> = Symbol('editor-ctx')

export function useEditorCtxRef() {
  return useAppInject(editorCtxKey)
}

export function useEditorCtx() {
  const ctxRef = useAppInject(editorCtxKey)
  if (ctxRef.value == null) throw new Error('useEditorCtx should be called inside of editor')
  return ctxRef.value
}
</script>

<script setup lang="ts">
import { type InjectionKey } from 'vue'
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

useAppProvide(editorCtxKey, editorCtx)
</script>
