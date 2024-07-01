<template>
  <EditorItemDetail :name="animation.name" @rename="handleRename">
    <div class="img-wrapper">
      <MuteSwitch class="mute-switch" state="normal" />
      <CheckerboardBackground class="background" />
      <div class="animation-container">
        <AnimationPlayer :animation="animation" class="animation-player" />
      </div>
    </div>
  </EditorItemDetail>
</template>

<script setup lang="ts">
import { useModal } from '@/components/ui'
import EditorItemDetail from '../common/EditorItemDetail.vue'
import CostumeRenameModal from './CostumeRenameModal.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import CheckerboardBackground from './CheckerboardBackground.vue'
import type { Animation } from '@/models/animation'
import AnimationPlayer from './animation/AnimationPlayer.vue'
import MuteSwitch from './animation/MuteSwitch.vue'

const props = defineProps<{
  animation: Animation
}>()

const editorCtx = useEditorCtx()
const renameCostume = useModal(CostumeRenameModal)

function handleRename() {
  renameCostume({
    costume: props.costume,
    sprite: props.sprite,
    project: editorCtx.project
  })
}
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

.animation-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.animation-player {
  max-width: 100%;
  max-height: 100%;
  z-index: 10;
}

.mute-switch {
  position: absolute;
  z-index: 20;
  top: 12px;
  right: 12px;
}
</style>
