<template>
  <EditorItemDetail :name="animation.name" @rename="emit('rename')">
    <AnimationPlayer
      :costumes="animation.costumes"
      :sound="sound"
      :sound-playback="animation.soundPlayback"
      :duration="animation.duration"
      class="w-full flex-[1_1_0]"
    />
    <AnimationSettings :animation="animation" :sound-editable="soundEditable" />
  </EditorItemDetail>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Animation } from '@/models/spx/animation'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import EditorItemDetail from '@/components/editor/common/EditorItemDetail.vue'
import AnimationPlayer from '@/components/editor/sprite/animation/AnimationPlayer.vue'
import AnimationSettings from '@/components/editor/sprite/animation/AnimationSettings.vue'

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
