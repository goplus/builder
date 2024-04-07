<template>
  <SoundEdit :asset="selectedSound" />
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useEditorCtx } from '../ProjectEditor.vue'
import SoundEdit from './SoundEdit.vue'
const editorCtx = useEditorCtx()

const selectedSound = computed(() => {
  if (editorCtx.selected?.type === 'sound') {
    return (
      editorCtx.project.sounds.find(
        (s) =>
          s.name ===
          (
            editorCtx.selected as {
              name: string
            }
          ).name
      ) || null
    )
  }
  return null
})
</script>
