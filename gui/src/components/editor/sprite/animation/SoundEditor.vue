<template>
  <UIDropdownForm
    v-radar="{ name: 'sound-editor-dropdown-form', desc: 'Dropdown form for selecting animation sound' }"
    :title="$t(actionName)"
    class="max-w-full"
    style="width: 408px; max-height: 400px"
    @cancel="emit('close')"
    @confirm="handleConfirm"
  >
    <ul class="flex-[1_1_0] flex flex-wrap content-start gap-2">
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
            v-radar="{ name: 'add-sound-button', desc: 'Click to add a new sound' }"
            class="text-primary-main justify-center"
          >
            <UIIcon class="w-6 h-6" type="plus" />
          </UIBlockItem>
        </template>
        <UIMenu>
          <UIMenuItem
            v-radar="{ name: 'add-from-local-file', desc: 'Click to add sound from local file' }"
            @click="handleAddFromLocalFile"
          >
            {{ $t({ en: 'Select local file', zh: '选择本地文件' }) }}
          </UIMenuItem>
          <UIMenuItem
            v-radar="{ name: 'add-from-asset-library', desc: 'Click to add sound from asset library' }"
            @click="handleAddFromAssetLibrary"
          >
            {{ $t({ en: 'Choose from asset library', zh: '从素材库选择' }) }}
          </UIMenuItem>
          <UIMenuItem v-radar="{ name: 'record-sound', desc: 'Click to record a new sound' }" @click="handleRecord">
            {{ $t({ en: 'Record', zh: '录音' }) }}
          </UIMenuItem>
        </UIMenu>
      </UIDropdown>
    </ul>
    <template v-if="selected != null" #footer-left>
      <div class="flex h-8 items-center gap-2">
        <span class="text-base text-grey-900">
          {{ $t({ en: 'Playback', zh: '播放' }) }}
        </span>
        <UITooltip>
          {{
            $t(
              selectedPlayback === AnimationSoundPlayback.Loop
                ? {
                    en: 'Loop the sound during each animation playback and stop it when the animation stops',
                    zh: '声音在动画的单次播放周期内循环播放，并在动画停止时停止'
                  }
                : {
                    en: 'Play the sound once and let it complete independently of the animation',
                    zh: '声音播放一次，并独立于动画完整播放'
                  }
            )
          }}
          <template #trigger>
            <UIDropdown v-model:visible="playbackMenuVisible" trigger="click" placement="top-end">
              <template #trigger>
                <UIButton
                  v-radar="{
                    name: 'Animation sound playback selector',
                    desc: 'Select how the selected sound plays with the animation'
                  }"
                  type="white"
                  class="gap-1 border-transparent! bg-transparent! px-1.5 text-sm"
                  aria-haspopup="menu"
                  :aria-expanded="playbackMenuVisible"
                >
                  {{
                    $t(
                      selectedPlayback === AnimationSoundPlayback.Loop
                        ? { en: 'Loop', zh: '循环' }
                        : { en: 'Once', zh: '一次' }
                    )
                  }}
                  <UIIcon type="arrowDown" class="size-3" />
                </UIButton>
              </template>
              <UIMenu role="menu">
                <UIMenuGroup>
                  <UIMenuItem
                    v-for="playback in [AnimationSoundPlayback.Once, AnimationSoundPlayback.Loop]"
                    :key="playback"
                    role="menuitemradio"
                    :aria-checked="selectedPlayback === playback"
                    tabindex="0"
                    class="min-w-24 justify-between pr-2 text-sm"
                    @click="handlePlaybackUpdate(playback)"
                    @keydown.enter.prevent="handlePlaybackUpdate(playback)"
                    @keydown.space.prevent="handlePlaybackUpdate(playback)"
                  >
                    {{
                      $t(
                        playback === AnimationSoundPlayback.Loop
                          ? { en: 'Loop', zh: '循环' }
                          : { en: 'Once', zh: '一次' }
                      )
                    }}
                    <UIIcon
                      type="check"
                      class="size-4 text-primary-main"
                      :class="{ invisible: selectedPlayback !== playback }"
                    />
                  </UIMenuItem>
                </UIMenuGroup>
              </UIMenu>
            </UIDropdown>
          </template>
        </UITooltip>
      </div>
    </template>
  </UIDropdownForm>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { AnimationSoundPlayback, type Animation } from '@/models/spx/animation'
import {
  UIDropdownForm,
  UIDropdown,
  UIMenu,
  UIMenuItem,
  UIBlockItem,
  UIIcon,
  UIButton,
  UIMenuGroup,
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
const selectedPlayback = ref(props.animation.soundPlayback)
const playbackMenuVisible = ref(false)
watch(
  () => props.animation.sound,
  (sound) => (selected.value = sound)
)
watch(
  () => props.animation.soundPlayback,
  (playback) => (selectedPlayback.value = playback)
)

function handlePlaybackUpdate(playback: AnimationSoundPlayback) {
  selectedPlayback.value = playback
  playbackMenuVisible.value = false
}

function handleSoundClick(sound: string) {
  if (selected.value === sound) selected.value = null
  else selected.value = sound
}

const addFromLocalFile = useAddSoundFromLocalFile()
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

const addAssetFromLibrary = useAddAssetFromLibrary()
const handleAddFromAssetLibrary = useMessageHandle(
  async () => {
    const sounds = await addAssetFromLibrary(editorCtx.project, AssetType.Sound)
    selected.value = sounds[0].id
  },
  { en: 'Failed to add sound from asset library', zh: '从素材库添加失败' }
).fn

const addSoundFromRecording = useAddSoundByRecording()
const handleRecord = useMessageHandle(
  async () => {
    const sound = await addSoundFromRecording(editorCtx.project)
    selected.value = sound.id
  },
  { en: 'Failed to record sound', zh: '录音失败' }
).fn

async function handleConfirm() {
  const sound = selected.value
  const playback = selectedPlayback.value
  await editorCtx.state.history.doAction({ name: actionName }, () => {
    props.animation.setSound(sound)
    props.animation.setSoundPlayback(playback)
  })
  emit('close')
}
</script>
