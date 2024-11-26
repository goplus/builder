<template>
  <slot></slot>
</template>

<script lang="ts">
import { inject } from 'vue'
import { Runtime } from '@/models/runtime'

export type EditorCtx = {
  project: Project
  userInfo: UserInfo
  runtime: Runtime
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
import { computedShallowReactive, useComputedDisposable } from '@/utils/utils'

const props = defineProps<{
  project: Project
  userInfo: UserInfo
}>()

const runtimeRef = useComputedDisposable(() => new Runtime(props.project))

const editorCtx = computedShallowReactive<EditorCtx>(() => ({
  project: props.project,
  userInfo: props.userInfo,
  runtime: runtimeRef.value
}))

provide(editorCtxKey, editorCtx)
</script>
