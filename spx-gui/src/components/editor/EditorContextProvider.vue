<template>
  <slot></slot>
</template>

<script lang="ts">
import { inject } from 'vue'
import { type Sprite } from '@/models/sprite'
import type { Sound } from '@/models/sound'

type Selected =
  | {
      type: 'sprite' | 'sound'
      name: string
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
import { provide, type InjectionKey, ref, watch, shallowReactive, computed, watchEffect } from 'vue'
import { Project } from '@/models/project'
import type { UserInfo } from '@/stores/user'

const props = defineProps<{
  project: Project
  userInfo: UserInfo
}>()

const selectedRef = ref<Selected | null>(null)

function select(selected: null): void
function select(type: 'stage'): void
function select(type: 'sprite' | 'sound', name: string): void
function select(type: any, name?: string) {
  selectedRef.value = name == null ? { type } : { type, name }
}

// When sprite name changed, we lose the selected state
// TODO: consider moving selected to model Project, so we can deal with renaming easily
const selectedSpriteName = computed(() => {
  const selected = selectedRef.value
  return selected?.type === 'sprite' ? selected.name : null
})

const selectedSprite = computed(() => {
  if (!selectedSpriteName.value) return null
  return props.project.sprites.find((s) => s.name === selectedSpriteName.value) || null
})

const selectedSoundName = computed(() => {
  const selected = selectedRef.value
  return selected?.type === 'sound' ? selected.name : null
})

const selectedSound = computed(() => {
  if (!selectedSoundName.value) return null
  return props.project.sounds.find((s) => s.name === selectedSoundName.value) || null
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
  // TODO: any simpler way to achieve this (like what Pinia do with store exposes)?
  editorCtx.project = props.project
  editorCtx.userInfo = props.userInfo
  editorCtx.selected = selectedRef.value
  editorCtx.selectedSprite = selectedSprite.value
  editorCtx.selectedSound = selectedSound.value
})

provide(editorCtxKey, editorCtx)
</script>
