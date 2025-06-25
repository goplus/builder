<template>
  <slot></slot>
</template>

<script lang="ts">
import { inject } from 'vue'
import { Runtime } from '@/models/runtime'
import type { Editing } from './editing'

export type EditorCtx = {
  project: Project
  userInfo: UserInfo
  runtime: Runtime
  editing: Editing
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
import type { UserInfo } from '@/stores/user'
import { computedShallowReactive } from '@/utils/utils'

const props = defineProps<{
  project: Project
  userInfo: UserInfo
  runtime: Runtime
  editing: Editing
}>()

const editorCtx = computedShallowReactive<EditorCtx>(() => ({
  project: props.project,
  userInfo: props.userInfo,
  runtime: props.runtime,
  editing: props.editing
}))

provide(editorCtxKey, editorCtx)
</script>
