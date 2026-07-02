<script setup lang="ts">
import { ref } from 'vue'
import { UITab, UITabs, UIModal, UIModalClose, useConfirmDialog } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { useWatchResult } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import type { SpxProject } from '@/models/spx/project'
import type { Sound } from '@/models/spx/sound'
import { initSoundGen } from '../modal'
import TTSGenComp from './TTSGen.vue'

const props = defineProps<{
  visible: boolean
  project: SpxProject
}>()

const emit = defineEmits<{
  resolved: [Sound]
  cancelled: []
}>()

const i18n = useI18n()
const confirm = useConfirmDialog()

type SoundGenerationType = 'tts'

const selectedType = ref<SoundGenerationType>('tts')

const generationTypes: Array<{ value: SoundGenerationType; label: { zh: string; en: string } }> = [
  {
    value: 'tts',
    label: { zh: '语音合成', en: 'Text to Speech' }
  }
]

const gen = useWatchResult(
  () => props.project,
  (_project, onCleanup) => initSoundGen(onCleanup)
)

const handleModalClose = useMessageHandle(
  async () => {
    await confirm({
      title: i18n.t({ zh: '退出声音生成？', en: 'Exit sound generation?' }),
      content: i18n.t({
        zh: '当前内容不会被保存，确定要退出吗？',
        en: 'Current progress will not be saved. Are you sure to exit?'
      }),
      confirmText: i18n.t({ en: 'Exit', zh: '退出' })
    })
    emit('cancelled')
  },
  { en: 'Failed to exit modal', zh: '退出失败' }
).fn
</script>

<template>
  <UIModal
    :radar="{ name: 'Sound generation modal', desc: 'Modal for sound generation' }"
    style="width: 960px; height: 720px"
    :visible="visible"
    mask-closable
    @update:visible="handleModalClose"
  >
    <header class="flex-none h-14 flex items-center justify-between border-b border-grey-400 px-6">
      <h2 class="text-xl text-title">{{ $t({ zh: '生成声音', en: 'Sound Generator' }) }}</h2>
      <UIModalClose class="close" @click="handleModalClose" />
    </header>

    <div class="flex-[1_1_0] min-h-0 px-6 py-5 flex flex-col">
      <div class="flex-auto overflow-hidden border border-grey-400 rounded-md flex flex-col">
        <UITabs v-model:value="selectedType" class="border-b border-grey-400">
          <UITab v-for="type in generationTypes" :key="type.value" :value="type.value">
            {{ $t(type.label) }}
          </UITab>
        </UITabs>

        <TTSGenComp
          v-if="gen != null && selectedType === 'tts'"
          class="flex-auto"
          :gen="gen"
          @resolved="emit('resolved', $event)"
        />
      </div>
    </div>
  </UIModal>
</template>
