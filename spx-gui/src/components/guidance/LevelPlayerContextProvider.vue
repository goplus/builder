<template>
    <slot></slot>
</template>
<script lang="ts">
import { inject } from 'vue'

export type Placement = {
  /** X position in px */
  x: number
  /** Y position in px */
  y: number
}
export type LevelPlayerCtx = {
  getPos(): Placement
  setPos(pos: Placement): void
}

const levelPlayerCtxKey: InjectionKey<LevelPlayerCtx> = Symbol('level-player-ctx')

export function useLevelPlayerCtx() {
  const ctx = inject(levelPlayerCtxKey)
  if (ctx == null) throw new Error('useLevelPlayerCtx should be called inside of LevelPlayerContextProvider')
  return ctx
}
</script>

<script setup lang="ts">
import { provide, type InjectionKey, ref } from 'vue'
import { computedShallowReactive } from '@/utils/utils'

const levelPlayerPos = ref<Placement>({
    x: 0,
    y: 0
})

const levelPlayerCtx = computedShallowReactive<LevelPlayerCtx>(() => ({
  getPos() {
    return levelPlayerPos.value
  },
  setPos(pos: Placement) {
    levelPlayerPos.value = pos
  }
}))

provide(levelPlayerCtxKey, levelPlayerCtx)
</script>