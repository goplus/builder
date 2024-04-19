<template>
  <CommonPanel
    :expanded="expanded"
    :active="editorCtx.selectedSound != null"
    :title="$t({ en: 'Sounds', zh: '声音' })"
    :color="uiVariables.color.sound"
    @expand="emit('expand')"
  >
    <template #add-options>
      <UIMenu>
        <UIMenuItem @click="handleUpload">{{ $t({ en: 'Upload', zh: '上传' }) }}</UIMenuItem>
        <UIMenuItem @click="handleChoose">{{ $t({ en: 'Choose', zh: '选择' }) }}</UIMenuItem>
        <UIMenuItem @click="handleRecord">{{ $t({ en: 'Record', zh: '录音' }) }}</UIMenuItem>
      </UIMenu>
    </template>
    <template #details>
      <SoundRecorderModal v-model:visible="recorderVisible" />
      <PanelList>
        <SoundItem
          v-for="sound in sounds"
          :key="sound.name"
          :sound="sound"
          :active="isSelected(sound)"
          @remove="handleSoundRemove(sound)"
          @click="handleSoundClick(sound)"
        />
      </PanelList>
    </template>
    <template #summary>
      <PanelSummaryList :has-more="soundsForOverviewHasMore">
        <SoundSummaryItem
          v-for="sound in soundsForOverview"
          :key="sound.name"
          :sound="sound"
        />
      </PanelSummaryList>
    </template>
  </CommonPanel>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { UIMenu, UIMenuItem, useUIVariables } from '@/components/ui'
import { AssetType } from '@/apis/asset'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { Sound } from '@/models/sound'
import SoundRecorderModal from '@/components/editor/sound/SoundRecorderModal.vue'
import { useAddAssetFromLibrary } from '@/components/library'
import { useMessageHandle } from '@/utils/exception'
import { selectAudio } from '@/utils/file'
import { stripExt } from '@/utils/path'
import { fromNativeFile } from '@/models/common/file'
import CommonPanel from '../common/CommonPanel.vue'
import PanelList from '../common/PanelList.vue'
import PanelSummaryList from '../common/PanelSummaryList.vue'
import SoundItem from './SoundItem.vue'
import SoundSummaryItem from './SoundSummaryItem.vue'

defineProps<{
  expanded: boolean
}>()

const emit = defineEmits<{
  expand: []
}>()

const uiVariables = useUIVariables()
const editorCtx = useEditorCtx()

const sounds = computed(() => editorCtx.project.sounds)

const numForPreview = 2 // TODO: it will be ideal to calculate the number (2) with element height
const soundsForOverview = computed(() => sounds.value.slice(0, numForPreview))
const soundsForOverviewHasMore = sounds.value.length > numForPreview

function isSelected(sound: Sound) {
  return sound.name === editorCtx.selectedSound?.name
}

function handleSoundRemove(sound: Sound) {
  editorCtx.project.removeSound(sound.name)
}

function handleSoundClick(sound: Sound) {
  editorCtx.select('sound', sound.name)
}

const handleUpload = useMessageHandle(
  async () => {
    const audio = await selectAudio()
    const project = editorCtx.project
    const file = fromNativeFile(audio)
    const sound = Sound.create(stripExt(audio.name), file)
    project.addSound(sound)
  },
  { en: 'Upload failed', zh: '上传失败' }
).fn

const addAssetFromLibrary = useAddAssetFromLibrary()

function handleChoose() {
  addAssetFromLibrary(editorCtx.project, AssetType.Sound)
}

const recorderVisible = ref(false)

function handleRecord() {
  recorderVisible.value = true
}
</script>

<style scoped lang="scss"></style>
