<template>
  <EditorItemDetail :name="animation.name" @rename="handleRename">
    <div class="img-wrapper">
      <CheckerboardBackground class="background" />
      <AnimationPlayer :animation="animation" class="animation-player" />
    </div>
    <div>
      <AnimationSettings :animation="animation" :sprite="sprite" />
    </div>
  </EditorItemDetail>
</template>

<script setup lang="ts">
import { useModal } from '@/components/ui'
import EditorItemDetail from '../common/EditorItemDetail.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import CheckerboardBackground from './CheckerboardBackground.vue'
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

const handleRename = useMessageHandle(
  async () => {
    renameCostume({
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
.img-wrapper {
  width: 100%;
  flex: 1 1 0;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.background {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
}

.animation-player {
  position: absolute;
  width: 100%;
  height: 100%;
}

.mute-switch {
  position: absolute;
  z-index: 20;
  top: 12px;
  right: 12px;
}
</style>
