<template>
  <UIMenu>
    <UIMenuItem
      v-radar="{ name: 'Add from local file', desc: 'Click to add sound from local file' }"
      @click="handleAddFromLocalFile"
    >
      {{ $t({ en: 'Select local file', zh: '选择本地文件' }) }}
    </UIMenuItem>
    <UIMenuItem
      v-radar="{ name: 'Add from asset library', desc: 'Click to add sound from asset library' }"
      @click="handleAddFromAssetLibrary"
    >
      {{ $t({ en: 'Choose from asset library', zh: '从素材库选择' }) }}
    </UIMenuItem>
    <UIMenuItem v-radar="{ name: 'Record sound', desc: 'Click to record a new sound' }" @click="handleRecord">
      {{ $t({ en: 'Record', zh: '录音' }) }}
    </UIMenuItem>
  </UIMenu>
</template>

<script setup lang="ts">
import { UIMenu, UIMenuItem } from '@/components/ui'
import { AssetType } from '@/apis/asset'
import { useMessageHandle } from '@/utils/exception'
import { useAddAssetFromLibrary, useAddSoundFromLocalFile, useAddSoundByRecording } from '@/components/asset'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import type { SoundsEditorState } from './sounds-editor-state'

const props = defineProps<{
  state: SoundsEditorState
}>()

const editorCtx = useEditorCtx()

const addFromLocalFile = useAddSoundFromLocalFile()
const handleAddFromLocalFile = useMessageHandle(
  async () => {
    const sound = await addFromLocalFile(editorCtx.project)
    props.state.select(sound.id)
  },
  {
    en: 'Failed to add sound from local file',
    zh: '从本地文件添加失败'
  }
).fn

const addAssetFromLibrary = useAddAssetFromLibrary()
const handleAddFromAssetLibrary = useMessageHandle(
  async () => {
    const nextSounds = await addAssetFromLibrary(editorCtx.project, AssetType.Sound)
    props.state.select(nextSounds[0].id)
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
    props.state.select(sound.id)
  },
  {
    en: 'Failed to record sound',
    zh: '录音失败'
  }
).fn
</script>
