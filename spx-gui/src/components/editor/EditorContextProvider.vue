<template>
  <slot></slot>
</template>

<script lang="ts">
import { inject } from 'vue'
import { Runtime } from '@/models/runtime'
import type { ClozeTestProvider } from '@/components/guidance/step/CodingStep.vue'
export type EditorCtx = {
  project: Project
  userInfo: UserInfo
  runtime: Runtime
  listFilter: ListFilter
  getClozeTestVisible: () => boolean
  setClozeTestVisible: (visible: boolean) => void
  getClozeTestProvider: () => ClozeTestProvider | null
  setClozeTestProvider: (provider: ClozeTestProvider | null) => void
}

const editorCtxKey: InjectionKey<EditorCtx> = Symbol('editor-ctx')

export function useEditorCtx() {
  const ctx = inject(editorCtxKey)
  if (ctx == null) throw new Error('useEditorCtx should be called inside of editor')
  return ctx
}
</script>

<script setup lang="ts">
import { provide, type InjectionKey, ref, type Ref } from 'vue'
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

const clozeTestVisible = ref(false)

const getClozeTestVisible = () => clozeTestVisible.value
const setClozeTestVisible = (visible: boolean) => (clozeTestVisible.value = visible)

const clozeTestProvider = ref(null) as Ref<ClozeTestProvider | null>
const getClozeTestProvider = () => clozeTestProvider.value
const setClozeTestProvider = (provider: ClozeTestProvider | null) => {
  clozeTestProvider.value = provider
}

const editorCtx = computedShallowReactive<EditorCtx>(() => ({
  project: props.project,
  userInfo: props.userInfo,
  runtime: props.runtime,
  listFilter,
  getClozeTestVisible,
  setClozeTestVisible,
  getClozeTestProvider,
  setClozeTestProvider
}))

provide(editorCtxKey, editorCtx)
</script>
