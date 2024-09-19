<template>
  <slot></slot>
</template>

<script lang="ts">
import { inject } from 'vue'
import type { RuntimeError } from '@/models/runtime'

export type EditorCtx = {
  project: Project
  userInfo: UserInfo
  debugProject: boolean
  debugErrorList: RuntimeError[]
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
}>()

const editorCtx = computedShallowReactive(() => ({
  project: props.project,
  userInfo: props.userInfo,
  debugProject: false,
  debugErrorList: []
}))

provide(editorCtxKey, editorCtx)
</script>
