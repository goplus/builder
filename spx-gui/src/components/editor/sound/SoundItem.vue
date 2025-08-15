<template>
  <UIEditorSoundItem
    v-radar="radarNodeMeta"
    :audio-src="audioSrc"
    :name="sound.name"
    :selectable="selectable"
    :color="color"
  >
    <template #player>
      <SoundPlayer :color="color" :src="audioSrc" />
    </template>
    <CornerMenu v-if="operable && selectable && selectable.selected" :color="color">
      <SaveAssetToLibraryMenuItem :item="sound" />
      <RenameMenuItem v-radar="{ name: 'Rename', desc: 'Click to rename the sound' }" @click="handleRename" />
      <RemoveMenuItem v-radar="{ name: 'Remove', desc: 'Click to remove the sound' }" @click="handleRemove" />
    </CornerMenu>
  </UIEditorSoundItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFileUrl } from '@/utils/file'
import { useMessageHandle } from '@/utils/exception'
import { Sound } from '@/models/sound'
import { UIEditorSoundItem } from '@/components/ui'
import CornerMenu from '../common/CornerMenu.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import SoundPlayer from './SoundPlayer.vue'
import { useRenameSound } from '@/components/asset'
import { SaveAssetToLibraryMenuItem, RenameMenuItem, RemoveMenuItem } from '@/components/editor/common/'

const props = withDefaults(
  defineProps<{
    sound: Sound
    color?: 'sound' | 'primary'
    selectable?: false | { selected: boolean }
    /** `operable: true` means the backdrop can be published & removed */
    operable?: boolean
  }>(),
  {
    color: 'sound',
    selectable: false,
    operable: false
  }
)

const [audioSrc] = useFileUrl(() => props.sound.file)

const editorCtx = useEditorCtx()

const radarNodeMeta = computed(() => {
  const name = `Sound item "${props.sound.name}"`
  const desc = props.selectable ? 'Click to select the sound and view more options' : ''
  return { name, desc }
})

const handleRemove = useMessageHandle(
  async () => {
    const name = props.sound.name
    const action = { name: { en: `Remove sound ${name}`, zh: `删除声音 ${name}` } }
    await editorCtx.project.history.doAction(action, () => editorCtx.project.removeSound(props.sound.id))
  },
  {
    en: 'Failed to remove sound',
    zh: '删除声音失败'
  }
).fn

const renameSound = useRenameSound()
const { fn: handleRename } = useMessageHandle(() => renameSound(props.sound), {
  en: 'Failed to rename sound',
  zh: '重命名声音失败'
})
</script>
