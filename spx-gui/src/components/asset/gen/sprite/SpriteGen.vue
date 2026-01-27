<script setup lang="ts">
import { computedShallowReactive } from '@/utils/utils'
import type { SpriteGen } from '@/models/gen/sprite-gen'
import type { Sprite } from '@/models/sprite'
import { provideLocalEditorCtx, useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import SpriteGenPhaseSettings from './SpriteGenPhaseSettings.vue'
import SpriteGenPhaseContent from './SpriteGenPhaseContent.vue'

const props = defineProps<{
  gen: SpriteGen
  /** Keyword entered by user when searching for assets. Show as placeholder in description input. */
  keyword?: string
}>()

const emit = defineEmits<{
  collapse: []
  finished: [Sprite]
}>()

const editorCtx = useEditorCtx()
const localEditorCtx = computedShallowReactive(() => ({
  project: props.gen.previewProject,
  state: editorCtx.state
}))

provideLocalEditorCtx(localEditorCtx)
</script>

<template>
  <SpriteGenPhaseContent
    v-if="gen.contentPreparingState.status === 'finished'"
    :gen="gen"
    @collapse="emit('collapse')"
    @finished="emit('finished', $event)"
  />
  <SpriteGenPhaseSettings v-else :gen="gen" :keyword="keyword" />
</template>

<style lang="scss" scoped></style>
