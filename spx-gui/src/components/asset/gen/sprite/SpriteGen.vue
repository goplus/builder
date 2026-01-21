<script setup lang="ts">
import { watch } from 'vue'
import { computedShallowReactive } from '@/utils/utils'
import type { SpriteGen } from '@/models/gen/sprite-gen'
import type { Sprite } from '@/models/sprite'
import { provideLocalEditorCtx, useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import SpriteGenPhaseSettings from './SpriteGenPhaseSettings.vue'
import SpriteGenPhaseContent from './SpriteGenPhaseContent.vue'

const props = defineProps<{
  gen: SpriteGen
}>()

const emit = defineEmits<{
  collapse: []
  finished: [Sprite]
  updateBackButtonVisible: [visible: boolean]
}>()

watch(
  () => props.gen.contentPreparingState.status,
  (status) => emit('updateBackButtonVisible', status !== 'finished'),
  {
    immediate: true
  }
)

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
  <SpriteGenPhaseSettings v-else :gen="gen" />
</template>

<style lang="scss" scoped></style>
