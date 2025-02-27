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
  listFilter: ListFilter
}

const editorCtxKey: InjectionKey<EditorCtx> = Symbol('editor-ctx')

export function useEditorCtx() {
  const ctx = inject(editorCtxKey)
  if (ctx === null) throw new Error('useEditorCtx should be called inside of editor')
  return ctx
}
</script>

<script setup lang="ts">
import { provide, type InjectionKey } from 'vue'
import { Project } from '@/models/project'
import type { UserInfo } from '@/stores/user'
import { computedShallowReactive } from '@/utils/utils'
import { ListFilter } from '@/models/list-filter'

const props = defineProps<{
  project: Project
  userInfo: UserInfo
  runtime: Runtime
}>()

const listFilter = new ListFilter()

const editorCtx = computedShallowReactive<EditorCtx>(() => ({
  project: props.project,
  userInfo: props.userInfo,
  runtime: props.runtime,
  listFilter
}))

provide(editorCtxKey, editorCtx)
</script>
