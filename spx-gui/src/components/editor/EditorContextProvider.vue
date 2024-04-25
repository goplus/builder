<template>
  <slot></slot>
</template>

<script lang="ts">
import { inject } from 'vue'
import type { Sprite } from '@/models/sprite'
import type { Sound } from '@/models/sound'

type Selected =
  | {
      type: 'sprite'
      value: Sprite
    }
  | {
      type: 'sound'
      value: Sound
    }
  | {
      type: 'stage'
    }

export type EditorCtx = {
  project: Project
  userInfo: UserInfo
  selected: Selected | null
  selectedSprite: Sprite | null
  selectedSound: Sound | null

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
import {
  provide,
  type InjectionKey,
  watch,
  shallowReactive,
  computed,
  watchEffect,
  shallowRef
} from 'vue'
import { Project } from '@/models/project'
import type { UserInfo } from '@/stores/user'

const props = defineProps<{
  project: Project
  userInfo: UserInfo
}>()

const selectedRef = shallowRef<Selected | null>(null)

function select(selected: null): void
function select(type: 'stage'): void
function select(type: 'sprite' | 'sound', name: string): void
function select(type: unknown, name?: string) {
  if (type === 'stage') {
    selectedRef.value = { type }
    return
  }
  if (type === 'sprite') {
    const sprite = props.project.sprites.find((s) => s.name === name)
    if (sprite == null) throw new Error(`sprite ${name} not found`)
    selectedRef.value = { type, value: sprite }
    return
  }
  if (type === 'sound') {
    const sound = props.project.sounds.find((s) => s.name === name)
    if (sound == null) throw new Error(`sound ${name} not found`)
    selectedRef.value = { type, value: sound }
    return
  }
  selectedRef.value = null
}

const selectedSprite = computed(() => {
  return selectedRef.value?.type === 'sprite' ? selectedRef.value.value : null
})

const selectedSound = computed(() => {
  return selectedRef.value?.type === 'sound' ? selectedRef.value.value : null
})

watch(
  () => props.project,
  (project) => {
    if (project.sprites.length > 0) {
      select('sprite', project.sprites[0].name)
    } else {
      select(null)
    }
  },
  { immediate: true }
)

const editorCtx = shallowReactive<EditorCtx>({ select } as any)
watchEffect(() => {
  // TODO: any simpler way to achieve this (like what Pinia do with store exposes)?
  editorCtx.project = props.project
  editorCtx.userInfo = props.userInfo
  editorCtx.selected = selectedRef.value
  editorCtx.selectedSprite = selectedSprite.value
  editorCtx.selectedSound = selectedSound.value
})

provide(editorCtxKey, editorCtx)
</script>
