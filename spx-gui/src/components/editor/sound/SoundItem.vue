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
    <CornerMenu v-if="removable" :color="color" removable :item="sound" @remove="handleRemove" />
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

const props = withDefaults(
  defineProps<{
    sound: Sound
    color?: 'sound' | 'primary'
    selectable?: false | { selected: boolean }
    removable?: boolean
  }>(),
  {
    color: 'sound',
    selectable: false,
    removable: false
  }
)

const [audioSrc] = useFileUrl(() => props.sound.file)

const editorCtx = useEditorCtx()

const removable = computed(() => props.removable && props.selectable && props.selectable.selected)

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
</script>
