<template>
  <UIDropdownForm
    v-radar="{ name: 'Sound editor dropdown form', desc: 'Dropdown form for selecting animation sound' }"
    :title="$t(actionName)"
    style="width: 320px; max-height: 400px"
    @cancel="emit('close')"
    @confirm="handleConfirm"
  >
    <ul class="flex-[1_1_0] flex flex-wrap content-start gap-3">
      <SoundItem
        v-for="sound in editorCtx.project.sounds"
        :key="sound.id"
        :sound="sound"
        :selectable="{ selected: sound.id === selected }"
        @click="handleSoundClick(sound.id)"
      />
      <UIDropdown trigger="click" placement="top">
        <template #trigger>
          <UIBlockItem
            v-radar="{ name: 'Add sound button', desc: 'Click to add a new sound' }"
            class="text-primary-main justify-center"
          >
            <UIIcon class="w-6 h-6" type="plus" />
          </UIBlockItem>
        </template>
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
      </UIDropdown>
    </ul>
    <div v-if="selected != null" class="mt-4 flex items-center justify-between gap-3 border-t border-grey-400 pt-3">
      <span class="flex-none text-xs font-medium text-grey-800">
        {{ $t({ en: 'Sound behavior', zh: '声音方式' }) }}
      </span>
      <UIButtonGroup
        v-radar="{
          name: 'Animation sound playback mode control',
          desc: 'Control to choose animation sound playback mode'
        }"
        type="text"
        :value="selectedMode"
        @update:value="(mode) => (selectedMode = mode as AnimationSoundMode)"
      >
        <UITooltip>
          {{
            $t({
              en: 'Play the sound once and let it complete independently of the animation',
              zh: '声音播放一次，并独立于动画完整播放'
            })
          }}
          <template #trigger>
            <UIButtonGroupItem :value="AnimationSoundMode.Complete">
              {{ $t({ en: 'Play once', zh: '播放一次' }) }}
            </UIButtonGroupItem>
          </template>
        </UITooltip>
        <UITooltip>
          {{
            $t({
              en: 'Play the sound with the animation and stop it when the animation stops',
              zh: '声音跟随动画播放，并在动画停止时停止'
            })
          }}
          <template #trigger>
            <UIButtonGroupItem :value="AnimationSoundMode.FollowAnimation">
              {{ $t({ en: 'Follow animation', zh: '跟随动画' }) }}
            </UIButtonGroupItem>
          </template>
        </UITooltip>
      </UIButtonGroup>
    </div>
  </UIDropdownForm>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { AnimationSoundMode, type Animation } from '@/models/spx/animation'
import {
  UIDropdownForm,
  UIDropdown,
  UIMenu,
  UIMenuItem,
  UIBlockItem,
  UIIcon,
  UIButtonGroup,
  UIButtonGroupItem,
  UITooltip
} from '@/components/ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import SoundItem from '@/components/editor/stage/sound/SoundItem.vue'
import { useAddAssetFromLibrary, useAddSoundFromLocalFile, useAddSoundByRecording } from '@/components/asset'
import { useMessageHandle } from '@/utils/exception'
import { AssetType } from '@/apis/asset'

const props = defineProps<{
  animation: Animation
}>()

const emit = defineEmits<{
  close: []
}>()

const editorCtx = useEditorCtx()

const actionName = { en: 'Select sound', zh: '选择声音' }
const selected = ref(props.animation.sound)
const selectedMode = ref(props.animation.soundMode)
function selectSound(sound: string) {
  if (selected.value == null) selectedMode.value = AnimationSoundMode.Complete
  selected.value = sound
}
async function handleSoundClick(sound: string) {
  if (selected.value === sound) selected.value = null
  else selectSound(sound)
}

const addFromLocalFile = useAddSoundFromLocalFile()
const handleAddFromLocalFile = useMessageHandle(
  async () => {
    const sound = await addFromLocalFile(editorCtx.project)
    selectSound(sound.id)
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
    selectSound(sounds[0].id)
  },
  { en: 'Failed to add sound from asset library', zh: '从素材库添加失败' }
).fn

const addSoundFromRecording = useAddSoundByRecording()
const handleRecord = useMessageHandle(
  async () => {
    const sound = await addSoundFromRecording(editorCtx.project)
    selectSound(sound.id)
  },
  { en: 'Failed to record sound', zh: '录音失败' }
).fn

async function handleConfirm() {
  await editorCtx.state.history.doAction({ name: actionName }, () => {
    props.animation.setSound(selected.value)
    props.animation.setSoundMode(selectedMode.value)
  })
  emit('close')
}
</script>
