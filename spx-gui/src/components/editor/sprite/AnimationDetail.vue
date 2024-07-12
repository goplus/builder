<template>
  <EditorItemDetail :name="animation.name" @rename="handleRename">
    <AnimationPlayer
      :costumes="animation.costumes"
      :sound="sound"
      :duration="animation.duration"
      class="animation-player"
    />
    <AnimationSettings :animation="animation" :sprite="sprite" />
  </EditorItemDetail>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useModal } from '@/components/ui'
import EditorItemDetail from '../common/EditorItemDetail.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import type { Animation } from '@/models/animation'
import AnimationPlayer from './animation/AnimationPlayer.vue'
import AnimationRenameModal from './AnimationRenameModal.vue'
import type { Sprite } from '@/models/sprite'
import AnimationSettings from './animation/AnimationSettings.vue'
import { useMessageHandle } from '@/utils/exception'

const props = defineProps<{
  animation: Animation
  sprite: Sprite
}>()

const editorCtx = useEditorCtx()
const renameCostume = useModal(AnimationRenameModal)
const sound = computed(
  () => editorCtx.project.sounds.find((sound) => sound.name === props.animation.sound) ?? null
)

const handleRename = useMessageHandle(
  () => {
    return renameCostume({
      animation: props.animation,
      sprite: props.sprite,
      project: editorCtx.project
    })
  },
  {
    en: 'Rename animation failed',
    zh: '重命名动画失败'
  }
).fn
</script>

<style lang="scss" scoped>
.animation-player {
  width: 100%;
  flex: 1 1 0;
}

.mute-switch {
  position: absolute;
  z-index: 20;
  top: 12px;
  right: 12px;
}
</style>
