<template>
  <UIEditorSoundItem :audio-src="audioSrc" :name="sound.name" :selected="selected">
    <template #default>
      <CornerMenu
        :visible="selected"
        color="sound"
        removable
        :item="sound"
        @remove="handleRemove"
      />
    </template>
    <template #player>
      <SoundPlayer color="sound" :src="audioSrc" />
    </template>
  </UIEditorSoundItem>
</template>

<script setup lang="ts">
import { useFileUrl } from '@/utils/file'
import { Sound } from '@/models/sound'
import { UIEditorSoundItem } from '@/components/ui'
import CornerMenu from '../../common/CornerMenu.vue'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import SoundPlayer from '../../sound/SoundPlayer.vue'

const props = defineProps<{
  sound: Sound
  selected: boolean
}>()

const [audioSrc] = useFileUrl(() => props.sound.file)

const editorCtx = useEditorCtx()

function handleRemove() {
  const name = props.sound.name
  const action = { name: { en: `Remove sound ${name}`, zh: `删除声音 ${name}` } }
  editorCtx.project.history.doAction(action, () => editorCtx.project.removeSound(name))
}
</script>

<style lang="scss" scoped>
.sound-player {
  width: 36px;
  height: 36px;
}
</style>
