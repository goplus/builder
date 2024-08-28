<template>
  <UIDropdownModal
    :title="$t(actionName)"
    style="width: 320px; max-height: 400px"
    @cancel="emit('close')"
    @confirm="handleConfirm"
  >
    <ul class="sound-items">
      <SoundItem
        v-for="sound in editorCtx.project.sounds"
        :key="sound.id"
        :sound="sound"
        :selected="sound.id === selected"
        @click="handleSoundClick(sound.id)"
      />
      <UIDropdown trigger="click" placement="top">
        <template #trigger>
          <UIBlockItem class="add-sound">
            <UIIcon class="icon" type="plus" />
          </UIBlockItem>
        </template>
        <UIMenu>
          <UIMenuItem @click="handleAddFromLocalFile">{{
            $t({ en: 'Select local file', zh: '选择本地文件' })
          }}</UIMenuItem>
          <UIMenuItem @click="handleAddFromAssetLibrary">{{
            $t({ en: 'Choose from asset library', zh: '从素材库选择' })
          }}</UIMenuItem>
          <UIMenuItem @click="handleRecord">{{ $t({ en: 'Record', zh: '录音' }) }}</UIMenuItem>
        </UIMenu>
      </UIDropdown>
    </ul>
    <SoundRecorderModal v-model:visible="recorderVisible" @saved="handleRecorded" />
  </UIDropdownModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Animation } from '@/models/animation'
import {
  UIDropdownModal,
  UIDropdown,
  UIMenu,
  UIMenuItem,
  UIBlockItem,
  UIIcon
} from '@/components/ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import SoundItem from './SoundItem.vue'
import { useAddAssetFromLibrary, useAddSoundFromLocalFile } from '@/components/asset'
import SoundRecorderModal from '@/components/editor/sound/SoundRecorderModal.vue'
import { useMessageHandle } from '@/utils/exception'
import { AssetType } from '@/apis/asset'
import type { Sound } from '@/models/sound'

const props = defineProps<{
  animation: Animation
}>()

const emit = defineEmits<{
  close: []
}>()

const editorCtx = useEditorCtx()

const actionName = { en: 'Select sound', zh: '选择声音' }
const selected = ref(props.animation.soundId)
async function handleSoundClick(sound: string) {
  selected.value = selected.value === sound ? null : sound
}

const addFromLocalFile = useAddSoundFromLocalFile(false)
const handleAddFromLocalFile = useMessageHandle(
  async () => {
    const sound = await addFromLocalFile(editorCtx.project)
    selected.value = sound.id
  },
  {
    en: 'Failed to add sound from local file',
    zh: '从本地文件添加失败'
  }
).fn

const addAssetFromLibrary = useAddAssetFromLibrary(false)
const handleAddFromAssetLibrary = useMessageHandle(
  async () => {
    const sounds = await addAssetFromLibrary(editorCtx.project, AssetType.Sound)
    selected.value = sounds[0].id
  },
  { en: 'Failed to add sound from asset library', zh: '从素材库添加失败' }
).fn

const recorderVisible = ref(false)
function handleRecord() {
  recorderVisible.value = true
}
function handleRecorded(sound: Sound) {
  selected.value = sound.id
}

async function handleConfirm() {
  await editorCtx.project.history.doAction({ name: actionName }, () =>
    props.animation.setSoundId(selected.value)
  )
  emit('close')
}
</script>

<style lang="scss" scoped>
.sound-items {
  flex: 1 1 0;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 12px;
}

.add-sound {
  justify-content: center;
  color: var(--ui-color-primary-main);
  .icon {
    width: 24px;
    height: 24px;
  }
}
</style>
