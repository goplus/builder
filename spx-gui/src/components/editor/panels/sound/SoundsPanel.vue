<template>
  <CommonPanel
    :expanded="expanded"
    :active="editorCtx.selectedSound != null"
    :title="$t({ en: 'Sounds', zh: '声音' })"
    color="sound"
    @expand="emit('expand')"
  >
    <template #add-options>
      <UIMenu>
        <UIMenuItem @click="handleAddFromLocalFile">{{ $t({ en: 'Select local file', zh: '选择本地文件' }) }}</UIMenuItem>
        <UIMenuItem @click="handleAddFromAssetLibrary">{{ $t({ en: 'Choose from asset library', zh: '从素材库选择' }) }}</UIMenuItem>
        <UIMenuItem @click="handleRecord">{{ $t({ en: 'Record', zh: '录音' }) }}</UIMenuItem>
      </UIMenu>
    </template>
    <template #details>
      <SoundRecorderModal v-model:visible="recorderVisible" @saved="handleRecorded" />
      <PanelList>
        <UIEmpty v-if="sounds.length === 0">
          {{ $t({ en: 'Click + to add sound', zh: '点击 + 号添加声音' }) }}
        </UIEmpty>
        <SoundItem
          v-for="sound in sounds"
          :key="sound.name"
          :sound="sound"
          :active="isSelected(sound)"
          @remove="handleSoundRemove(sound)"
          @add-to-asset-library="addToLibrary(sound)"
          @click="handleSoundClick(sound)"
        />
      </PanelList>
    </template>
    <template #summary>
      <PanelSummaryList ref="summaryList" :has-more="summaryListData.hasMore">
        <UIEmpty v-if="sounds.length === 0">
          {{ $t({ en: 'Empty', zh: '无' }) }}
        </UIEmpty>
        <SoundSummaryItem v-for="sound in summaryListData.list" :key="sound.name" :sound="sound" />
      </PanelSummaryList>
    </template>
  </CommonPanel>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { UIMenu, UIMenuItem, UIEmpty } from '@/components/ui'
import { AssetType } from '@/apis/asset'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { Sound } from '@/models/sound'
import SoundRecorderModal from '@/components/editor/sound/SoundRecorderModal.vue'
import { useAddAssetFromLibrary, useAddAssetToLibrary } from '@/components/asset'
import { useMessageHandle } from '@/utils/exception'
import { selectAudio } from '@/utils/file'
import { stripExt } from '@/utils/path'
import { fromNativeFile } from '@/models/common/file'
import CommonPanel from '../common/CommonPanel.vue'
import PanelList from '../common/PanelList.vue'
import PanelSummaryList, { useSummaryList } from '../common/PanelSummaryList.vue'
import SoundItem from './SoundItem.vue'
import SoundSummaryItem from './SoundSummaryItem.vue'

defineProps<{
  expanded: boolean
}>()

const emit = defineEmits<{
  expand: []
}>()

const editorCtx = useEditorCtx()

const sounds = computed(() => editorCtx.project.sounds)
const summaryList = ref<InstanceType<typeof PanelSummaryList>>()
const summaryListData = useSummaryList(sounds, () => summaryList.value?.listWrapper ?? null)

function isSelected(sound: Sound) {
  return sound.name === editorCtx.selectedSound?.name
}

function handleSoundRemove(sound: Sound) {
  editorCtx.project.removeSound(sound.name)
}

const addToLibrary = useAddAssetToLibrary()

function handleSoundClick(sound: Sound) {
  editorCtx.select('sound', sound.name)
}

const handleAddFromLocalFile = useMessageHandle(
  async () => {
    const audio = await selectAudio()
    const sound = await Sound.create(stripExt(audio.name), fromNativeFile(audio))
    editorCtx.project.addSound(sound)
    editorCtx.select('sound', sound.name)
  },
  { en: 'Add from local file failed', zh: '从本地文件添加失败' }
).fn

const addAssetFromLibrary = useAddAssetFromLibrary()

async function handleAddFromAssetLibrary() {
  const sounds = await addAssetFromLibrary(editorCtx.project, AssetType.Sound)
  editorCtx.select('sound', sounds[0].name)
}

const recorderVisible = ref(false)

function handleRecord() {
  recorderVisible.value = true
}

function handleRecorded(sound: Sound) {
  editorCtx.select('sound', sound.name)
}
</script>

<style scoped lang="scss"></style>
