<script setup lang="ts">
import { computed } from 'vue'
import { UIButton, UIButtonGroup, UIButtonGroupItem, UITextInput } from '@/components/ui'
import { type SoundVoiceAgeGroup, type SoundVoiceGender } from '@/apis/aigc'
import type { Sound } from '@/models/spx/sound'
import type { SoundGen } from '@/models/spx/gen/sound-gen'
import { capture, useMessageHandle } from '@/utils/exception'
import { useFileUrl } from '@/utils/file'
import SoundPlayer from '@/components/editor/stage/sound/SoundPlayer.vue'
import type { LocaleMessage } from '@/utils/i18n'

const props = defineProps<{
  gen: SoundGen
}>()

const emit = defineEmits<{
  resolved: [Sound]
}>()

type SelectOption<T> = {
  value: T
  label: LocaleMessage
}

const maxSpeechTextLength = 200
const maxInstructionLength = 50

const voiceGenderOptions: Array<SelectOption<SoundVoiceGender>> = [
  { value: 'male', label: { en: 'Male', zh: '男声' } },
  { value: 'female', label: { en: 'Female', zh: '女声' } }
]

const voiceAgeGroupOptions: Array<SelectOption<SoundVoiceAgeGroup>> = [
  { value: 'child', label: { en: 'Child', zh: '儿童' } },
  { value: 'youth', label: { en: 'Youth', zh: '青年' } },
  { value: 'middle-aged', label: { en: 'Middle-aged', zh: '中年' } },
  { value: 'senior', label: { en: 'Senior', zh: '老年' } }
]

const presetRateOptions: Array<SelectOption<number>> = [
  { value: 0.8, label: { en: 'Slow', zh: '慢' } },
  { value: 0.9, label: { en: 'Slightly slow', zh: '稍慢' } },
  { value: 1.0, label: { en: 'Standard', zh: '标准' } },
  { value: 1.1, label: { en: 'Slightly fast', zh: '稍快' } },
  { value: 1.2, label: { en: 'Fast', zh: '快' } }
]
const presetPitchOptions: Array<SelectOption<number>> = [
  { value: 0.85, label: { en: 'Low', zh: '低' } },
  { value: 0.95, label: { en: 'Slightly low', zh: '稍低' } },
  { value: 1.0, label: { en: 'Standard', zh: '标准' } },
  { value: 1.05, label: { en: 'Slightly high', zh: '稍高' } },
  { value: 1.15, label: { en: 'High', zh: '高' } }
]

const [resultSrc] = useFileUrl(() => props.gen.result?.file ?? null)

const canGenerate = computed(
  () =>
    props.gen.generateState.status !== 'running' &&
    props.gen.settings.name.trim() !== '' &&
    props.gen.settings.speechSettings.text.trim() !== ''
)

const handleGenerate = useMessageHandle(() => props.gen.generate(), {
  en: 'Failed to generate sound',
  zh: '生成声音失败'
})

const handleUse = useMessageHandle(
  async () => {
    const sound = props.gen.result
    if (sound == null) throw new Error('generated sound expected')
    props.gen.recordAdoption().catch((err) => {
      capture(err, 'failed to record sound asset adoption')
    })
    emit('resolved', sound)
  },
  {
    en: 'Failed to use sound',
    zh: '采用声音失败'
  }
)
</script>

<template>
  <main
    v-radar="{ name: 'TTS generation', desc: 'Interface for generating speech with text to speech' }"
    class="flex flex-col min-h-0"
  >
    <section class="flex-1 min-h-0 px-6 py-5 overflow-y-auto">
      <div class="grid gap-5 max-w-5xl">
        <div class="grid gap-2">
          <label class="text-base font-semibold">{{ $t({ en: 'Name', zh: '声音名称' }) }}</label>
          <UITextInput
            :value="gen.settings.name"
            :placeholder="$t({ en: 'e.g. greeting', zh: '例如：问侯' })"
            @update:value="gen.setSettings({ name: $event })"
          />
        </div>

        <div class="grid gap-2">
          <div class="flex items-center justify-between">
            <label class="text-base font-semibold">{{ $t({ en: 'Text', zh: '文本' }) }}</label>
            <span class="text-xs text-grey-700">
              {{ gen.settings.speechSettings.text.length }}/{{ maxSpeechTextLength }}
            </span>
          </div>
          <UITextInput
            type="textarea"
            :rows="3"
            :value="gen.settings.speechSettings.text"
            :placeholder="$t({ en: 'Enter the speech text to synthesize', zh: '输入要合成的语音文本' })"
            @update:value="gen.setSettings({ speechSettings: { text: $event.slice(0, maxSpeechTextLength) } })"
          />
        </div>

        <div class="grid gap-2">
          <label class="text-base font-semibold">{{ $t({ en: 'Speech settings', zh: '声音设定' }) }}</label>
          <div class="flex flex-col gap-3">
            <div class="flex items-start gap-4">
              <label class="pt-1.5 text-sm text-grey-800">{{ $t({ en: 'Gender', zh: '性别' }) }}</label>
              <UIButtonGroup
                :value="gen.settings.speechSettings.voiceGender"
                @update:value="
                  (value) => gen.setSettings({ speechSettings: { voiceGender: value as SoundVoiceGender } })
                "
              >
                <UIButtonGroupItem
                  v-for="option in voiceGenderOptions"
                  :key="option.value"
                  :value="option.value"
                  class="w-auto px-3 text-sm whitespace-nowrap"
                >
                  {{ $t(option.label) }}
                </UIButtonGroupItem>
              </UIButtonGroup>
              <label class="ml-4 pt-1.5 text-sm text-grey-800">{{ $t({ en: 'Age', zh: '年龄' }) }}</label>
              <UIButtonGroup
                :value="gen.settings.speechSettings.voiceAgeGroup"
                class="max-w-full"
                @update:value="
                  (value) => gen.setSettings({ speechSettings: { voiceAgeGroup: value as SoundVoiceAgeGroup } })
                "
              >
                <UIButtonGroupItem
                  v-for="option in voiceAgeGroupOptions"
                  :key="option.value"
                  :value="option.value"
                  class="w-auto px-3 text-sm whitespace-nowrap"
                >
                  {{ $t(option.label) }}
                </UIButtonGroupItem>
              </UIButtonGroup>
            </div>
            <div class="flex items-start gap-4">
              <label class="pt-1.5 text-sm text-grey-800">{{ $t({ en: 'Speed', zh: '语速' }) }}</label>
              <UIButtonGroup
                :value="String(gen.settings.speechSettings.rate ?? 1.0)"
                class="max-w-full"
                @update:value="(value) => gen.setSettings({ speechSettings: { rate: Number(value) } })"
              >
                <UIButtonGroupItem
                  v-for="option in presetRateOptions"
                  :key="option.value"
                  :value="String(option.value)"
                  class="w-auto px-3 text-sm whitespace-nowrap"
                >
                  {{ $t(option.label) }}
                </UIButtonGroupItem>
              </UIButtonGroup>
            </div>
            <div class="flex items-start gap-4">
              <label class="pt-1.5 text-sm text-grey-800">{{ $t({ en: 'Pitch', zh: '音调' }) }}</label>
              <UIButtonGroup
                :value="String(gen.settings.speechSettings.pitch ?? 1.0)"
                class="max-w-full"
                @update:value="(value) => gen.setSettings({ speechSettings: { pitch: Number(value) } })"
              >
                <UIButtonGroupItem
                  v-for="option in presetPitchOptions"
                  :key="option.value"
                  :value="String(option.value)"
                  class="w-auto px-3 text-sm whitespace-nowrap"
                >
                  {{ $t(option.label) }}
                </UIButtonGroupItem>
              </UIButtonGroup>
            </div>
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <label class="text-sm text-grey-800">{{ $t({ en: 'Instruction', zh: '补充说明' }) }}</label>
                <span class="text-xs text-grey-700">
                  {{ gen.settings.speechSettings.instruction?.length ?? 0 }}/{{ maxInstructionLength }}
                </span>
              </div>
              <UITextInput
                type="textarea"
                :rows="2"
                :value="gen.settings.speechSettings.instruction ?? ''"
                :placeholder="
                  $t({
                    en: 'Add extra information such as role, emotion, context, speaking style, etc. For example: The tone should be lively and playful, with a clear smile, making the voice sound full of energy and sunshine.',
                    zh: '可补充角色、情绪、语境、说话风格等信息，例如：语气要显得活泼俏皮，带着明显的笑意，让声音听起来充满朝气与阳光。'
                  })
                "
                @update:value="
                  gen.setSettings({ speechSettings: { instruction: $event.slice(0, maxInstructionLength) } })
                "
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <footer class="flex-none border-t border-grey-400 px-6 py-4 flex items-center justify-between gap-6">
      <div class="flex-auto flex items-center gap-3">
        <template v-if="resultSrc != null && gen.result != null">
          <SoundPlayer :src="resultSrc" />
          <label class="text-base font-medium"> &lt;- {{ $t({ en: 'Click to preview', zh: '点击试听' }) }}</label>
        </template>
        <div v-else class="text-sm text-grey-700">
          {{
            $t({
              en: 'Generate once to preview the synthesized sound here.',
              zh: '点击生成后，可在这里试听合成结果。'
            })
          }}
        </div>
      </div>

      <div class="flex-none flex items-center gap-3">
        <UIButton
          type="neutral"
          size="large"
          :disabled="!canGenerate"
          :loading="handleGenerate.isLoading.value"
          @click="handleGenerate.fn"
        >
          {{
            $t({
              en: gen.generateState.status === 'initial' ? 'Generate' : 'Regenerate',
              zh: gen.generateState.status === 'initial' ? '生成' : '重新生成'
            })
          }}
        </UIButton>
        <UIButton
          type="primary"
          size="large"
          :disabled="gen.result == null"
          :loading="handleUse.isLoading.value"
          @click="handleUse.fn"
        >
          {{ $t({ en: 'Use', zh: '采用' }) }}
        </UIButton>
      </div>
    </footer>
  </main>
</template>
