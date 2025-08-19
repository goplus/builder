<template>
  <CommonPanel
    v-radar="{ name: 'Sounds panel', desc: 'Panel for managing project sounds' }"
    :expanded="expanded"
    :active="editorCtx.state.selectedSound != null"
    :title="$t({ en: 'Sounds', zh: '声音' })"
    color="sound"
    @expand="emit('expand')"
  >
    <template #add-options>
      <UIMenu>
        <UIMenuItem
          v-radar="{ name: 'Add from local file', desc: 'Click to add sound from local file' }"
          @click="handleAddFromLocalFile"
          >{{ $t({ en: 'Select local file', zh: '选择本地文件' }) }}</UIMenuItem
        >
        <UIMenuItem
          v-radar="{ name: 'Add from asset library', desc: 'Click to add sound from asset library' }"
          @click="handleAddFromAssetLibrary"
          >{{ $t({ en: 'Choose from asset library', zh: '从素材库选择' }) }}</UIMenuItem
        >
        <UIMenuItem v-radar="{ name: 'Record sound', desc: 'Click to record a new sound' }" @click="handleRecord">{{
          $t({ en: 'Record', zh: '录音' })
        }}</UIMenuItem>
      </UIMenu>
    </template>
    <template #details>
      <PanelList :sortable="{ list: sounds }" @sorted="handleSorted">
        <UIEmpty v-if="sounds.length === 0" size="medium">
          {{ $t({ en: 'Click + to add sound', zh: '点击 + 号添加声音' }) }}
        </UIEmpty>
        <SoundItem
          v-for="sound in sounds"
          :key="sound.id"
          :sound="sound"
          :selectable="{ selected: isSelected(sound) }"
          operable
          @click="handleSoundClick(sound)"
        />
      </PanelList>
    </template>
    <template #summary>
      <PanelSummaryList ref="summaryList" :has-more="summaryListData.hasMore">
        <UIEmpty v-if="sounds.length === 0" size="small">
          {{ $t({ en: 'Empty', zh: '无' }) }}
        </UIEmpty>
        <SoundSummaryItem v-for="sound in summaryListData.list" :key="sound.id" :sound="sound" />
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
import { useAddAssetFromLibrary, useAddSoundFromLocalFile, useAddSoundByRecording } from '@/components/asset'
import { useMessageHandle } from '@/utils/exception'
import SoundItem from '@/components/editor/sound/SoundItem.vue'
import CommonPanel from '../common/CommonPanel.vue'
import PanelList from '../common/PanelList.vue'
import PanelSummaryList, { useSummaryList } from '../common/PanelSummaryList.vue'
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
  return sound.id === editorCtx.state.selectedSound?.id
}

function handleSoundClick(sound: Sound) {
  editorCtx.state.selectSound(sound.id)
}

const addFromLocalFile = useAddSoundFromLocalFile()
const handleAddFromLocalFile = useMessageHandle(
  async () => {
    const sound = await addFromLocalFile(editorCtx.project)
    editorCtx.state.selectSound(sound.id)
  },
  {
    en: 'Failed to add sound from local file',
    zh: '从本地文件添加失败'
  }
).fn

const addAssetFromLibrary = useAddAssetFromLibrary()
const handleAddFromAssetLibrary = useMessageHandle(
  async () => {
    const sounds = await addAssetFromLibrary(editorCtx.project, AssetType.Sound)
    editorCtx.state.selectSound(sounds[0].id)
  },
  {
    en: 'Failed to add sound from asset library',
    zh: '从素材库添加失败'
  }
).fn

const addSoundFromRecording = useAddSoundByRecording()
const handleRecord = useMessageHandle(
  async () => {
    const sound = await addSoundFromRecording(editorCtx.project)
    editorCtx.state.selectSound(sound.id)
  },
  {
    en: 'Failed to record sound',
    zh: '录音失败'
  }
).fn

const handleSorted = useMessageHandle(
  async (oldIdx: number, newIdx: number) => {
    const action = { name: { en: 'Update sound order', zh: '更新声音顺序' } }
    await editorCtx.project.history.doAction(action, () => editorCtx.project.moveSound(oldIdx, newIdx))
  },
  {
    en: 'Failed to update sound order',
    zh: '更新声音顺序失败'
  }
).fn
</script>

<style scoped lang="scss"></style>
