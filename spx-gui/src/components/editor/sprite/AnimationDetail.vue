<template>
  <EditorItemDetail :name="animation.name" @rename="handleRename">
    <TagNode name="animation-player">
      <AnimationPlayer
        :costumes="animation.costumes"
        :sound="sound"
        :duration="animation.duration"
        class="animation-player"
      />
    </TagNode>
    <TagNode name="animation-setting">
      <AnimationSettings :animation="animation" :sprite="sprite" :sounds="editorCtx.project.sounds" />
    </TagNode>
  </EditorItemDetail>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import type { Animation } from '@/models/animation'
import type { Sprite } from '@/models/sprite'
import { useRenameAnimation } from '@/components/asset'
import EditorItemDetail from '../common/EditorItemDetail.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import AnimationPlayer from './animation/AnimationPlayer.vue'
import AnimationSettings from './animation/AnimationSettings.vue'

const props = defineProps<{
  animation: Animation
  sprite: Sprite
}>()

const editorCtx = useEditorCtx()
const renameCostume = useRenameAnimation()
const sound = computed(() => editorCtx.project.sounds.find((sound) => sound.id === props.animation.sound) ?? null)

const handleRename = useMessageHandle(() => renameCostume(props.animation), {
  en: 'Rename animation failed',
  zh: '重命名动画失败'
}).fn
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
