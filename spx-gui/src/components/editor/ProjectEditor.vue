<template>
  <div class="main">
    <SpxEditor />
  </div>
  <div class="sider">
    <SpxStage :project="props.project" />
    <EditorPanels />
  </div>
</template>

<script lang="ts">
import { inject } from 'vue'
import { type Sprite } from '@/models/sprite'

type Selected =
  | {
      type: 'sprite' | 'sound'
      name: string
    }
  | {
      type: 'stage'
    }

// TODO: move stores/editor here
export type EditorCtx = {
  project: Project
  userInfo: UserInfo
  selected: Selected | null
  selectedSprite: Sprite | null

  select(selected: null): void
  select(type: 'stage'): void
  select(type: 'sprite' | 'sound', name: string): void
}

const editorCtxKey: InjectionKey<EditorCtx> = Symbol('editor-ctx')

export function useEditorCtx() {
  const ctx = inject(editorCtxKey)
  if (ctx == null) throw new Error('useEditorCtx should be called inside of editor')
  return ctx
}
</script>

<script setup lang="ts">
import { provide, type InjectionKey, ref, watch, shallowReactive, computed, watchEffect } from 'vue'
import { Project } from '@/models/project'
import type { UserInfo } from '@/stores/user'
import SpxEditor from './SpxEditor.vue'
import SpxStage from './stage/SpxStage.vue'
import EditorPanels from './panels/EditorPanels.vue'

const props = defineProps<{
  project: Project
  userInfo: UserInfo
}>()

const selectedRef = ref<Selected | null>(null)

/* eslint-disable no-redeclare */ // TODO: there should be no need to configure this
function select(selected: null): void
function select(type: 'stage'): void
function select(type: 'sprite' | 'sound', name: string): void
function select(type: any, name?: string) {
  selectedRef.value = type == null ? type : { type, name }
}
/* eslint-enable no-redeclare */

const selectedSpriteName = computed(() => {
  const selected = selectedRef.value
  return selected?.type === 'sprite' ? selected.name : null
})

const selectedSprite = computed(() => {
  if (!selectedSpriteName.value) return null
  return props.project.sprites.find((s) => s.name === selectedSpriteName.value) || null
})

watch(
  () => props.project,
  (project) => {
    if (project.sprites.length > 0) {
      select('sprite', project.sprites[0].name)
    } else {
      select(null)
    }
  }
)

const editorCtx = shallowReactive<EditorCtx>({ select } as any)
watchEffect(() => {
  // TODO: any simpler way to archieve this (like what Pinia do with store exposes)?
  editorCtx.project = props.project
  editorCtx.userInfo = props.userInfo
  editorCtx.selected = selectedRef.value
  editorCtx.selectedSprite = selectedSprite.value
})

provide(editorCtxKey, editorCtx)
</script>

<style scoped lang="scss">
.main {
  flex: 1 1 0;
  overflow-x: auto;
}
.sider {
  flex: 0 0 40%;
  display: flex;
  flex-direction: column;
}
</style>
