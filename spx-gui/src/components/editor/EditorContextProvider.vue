<template>
  <slot></slot>
</template>

<script lang="ts">
import { useAppProvide, useAppInject } from '@/utils/app-state'
import type { EditorState } from './editor-state'

export type EditorCtx = {
  project: SpxProject
  state: EditorState
}

const editorCtxKey: InjectionKey<EditorCtx> = Symbol('editor-ctx')

/** Provide an editor context value, which will take effect globally */
function provideGlobalEditorCtx(ctx: EditorCtx) {
  useAppProvide(editorCtxKey, ctx)
}

/** Provide a local editor context value, which will override the global one in the current component subtree */
export function provideLocalEditorCtx(ctx: EditorCtx) {
  provide(editorCtxKey, ctx)
}

export function useEditorCtxRef() {
  return useAppInject(editorCtxKey)
}

export function useEditorCtx() {
  const localCtx = inject(editorCtxKey, null)
  if (localCtx != null) return localCtx
  const ctxRef = useAppInject(editorCtxKey)
  if (ctxRef.value == null) throw new Error('useEditorCtx should be called inside of editor')
  return ctxRef.value
}
</script>

<script setup lang="ts">
import { inject, provide, type InjectionKey } from 'vue'
import { SpxProject } from '@/models/spx/project'
import { computedShallowReactive } from '@/utils/utils'

const props = defineProps<{
  project: SpxProject
  state: EditorState
}>()

const editorCtx = computedShallowReactive<EditorCtx>(() => ({
  project: props.project,
  state: props.state
}))

provideGlobalEditorCtx(editorCtx)
</script>
