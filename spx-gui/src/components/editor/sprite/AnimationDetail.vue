<template>
  <EditorItemDetail :name="animation.name" @rename="emit('rename')">
    <AnimationPlayer
      :costumes="animation.costumes"
      :sound="sound"
      :duration="animation.duration"
      class="animation-player"
    />
    <AnimationSettings :animation="animation" :sound-editable="soundEditable" />
  </EditorItemDetail>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Animation } from '@/models/spx/animation'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import EditorItemDetail from '../common/EditorItemDetail.vue'
import AnimationPlayer from './animation/AnimationPlayer.vue'
import AnimationSettings from './animation/AnimationSettings.vue'

const props = withDefaults(
  defineProps<{
    animation: Animation
    /** If it is supported to edit sound of the animation */
    soundEditable?: boolean
  }>(),
  {
    soundEditable: true
  }
)

const emit = defineEmits<{
  rename: []
}>()

const editorCtx = useEditorCtx()
const sound = computed(() => editorCtx.project.sounds.find((sound) => sound.id === props.animation.sound) ?? null)
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
