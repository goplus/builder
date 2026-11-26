<script setup lang="ts">
import { computed } from 'vue'
import { useFileUrl } from '@/utils/file'
import { useMessageHandle } from '@/utils/exception'
import { Sound } from '@/models/spx/sound'
import { UIEditorSoundItem, UIRadio } from '@/components/ui'
import CornerMenu from '../../common/CornerMenu.vue'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import SoundPlayer from './SoundPlayer.vue'
import { useRenameSound } from '@/components/asset'
import {
  SaveAssetToLibraryMenuItem,
  RenameMenuItem,
  RemoveMenuItem,
  DuplicateMenuItem
} from '@/components/editor/common/'

const props = withDefaults(
  defineProps<{
    sound: Sound
    selectable?: false | { selected: boolean }
    compact?: boolean
    /** `operable: true` means the backdrop can be published & removed */
    operable?: boolean
  }>(),
  {
    selectable: false,
    compact: false,
    operable: false
  }
)
const emit = defineEmits<{ click: [] }>()

const [audioSrc] = useFileUrl(() => props.sound.file)

const editorCtx = useEditorCtx()

const radarNodeMeta = computed(() => {
  const desc = props.selectable ? 'Click to select the sound and view more options' : ''
  return { name: 'sound-item', desc, attrs: { name: props.sound.name } }
})

const { fn: handleDuplicate } = useMessageHandle(
  async () => {
    const sound = props.sound
    const action = { name: { en: `Duplicate sound ${sound.name}`, zh: `复制声音 ${sound.name}` } }
    await editorCtx.state.history.doAction(action, () => {
      const newSound = sound.clone()
      editorCtx.project.addSoundAfter(newSound, sound.id)
      editorCtx.state.selectSound(newSound.id)
    })
  },
  {
    en: 'Failed to duplicate sound',
    zh: '复制声音失败'
  }
)

const handleRemove = useMessageHandle(
  async () => {
    const name = props.sound.name
    const action = { name: { en: `Remove sound ${name}`, zh: `删除声音 ${name}` } }
    await editorCtx.state.history.doAction(action, () => editorCtx.project.removeSound(props.sound.id))
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

<template>
  <div
    v-if="compact"
    class="flex min-w-0 items-center gap-2 rounded-sm pl-2"
    :class="selectable && selectable.selected ? 'bg-primary-100' : 'hover:bg-grey-300'"
  >
    <UIRadio v-radar="radarNodeMeta" :value="sound.id" class="sound-radio h-8 min-w-0 flex-1">
      <span class="block truncate" :title="sound.name">{{ sound.name }}</span>
    </UIRadio>
    <div class="flex shrink-0 items-center gap-0.5 pr-1">
      <slot name="actions"></slot>
      <SoundPlayer :src="audioSrc" compact />
    </div>
  </div>
  <UIEditorSoundItem
    v-else
    v-radar="radarNodeMeta"
    :audio-src="audioSrc"
    :name="sound.name"
    :selectable="selectable"
    @click="emit('click')"
  >
    <template #player>
      <SoundPlayer :src="audioSrc" />
    </template>
    <CornerMenu v-if="operable && selectable && selectable.selected">
      <DuplicateMenuItem
        v-radar="{ name: 'duplicate', desc: 'Click to duplicate the sound' }"
        @click="handleDuplicate"
      />
      <RenameMenuItem v-radar="{ name: 'rename', desc: 'Click to rename the sound' }" @click="handleRename" />
      <SaveAssetToLibraryMenuItem :item="sound" />
      <RemoveMenuItem v-radar="{ name: 'remove', desc: 'Click to remove the sound' }" @click="handleRemove" />
    </CornerMenu>
  </UIEditorSoundItem>
</template>

<style scoped>
.sound-radio :deep(.label) {
  min-width: 0;
}
</style>
