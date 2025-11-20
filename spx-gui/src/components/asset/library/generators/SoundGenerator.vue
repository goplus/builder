<template>
  <div class="sound-generator">
    <!-- Step 1: Enriching settings -->
    <div v-if="stage === 'enriching'" class="stage-container">
      <UILoading />
      <p class="stage-message">
        {{ $t({ en: 'Enriching settings...', zh: '正在丰富设置...' }) }}
      </p>
    </div>

    <!-- Step 2: Edit settings -->
    <div v-else-if="stage === 'editing'" class="stage-container">
      <h3 class="stage-title">{{ $t({ en: 'Sound Settings', zh: '声音设置' }) }}</h3>
      <div class="settings-form">
        <div class="form-group">
          <label>{{ $t({ en: 'Description', zh: '描述' }) }}</label>
          <UITextInput
            v-model:value="description"
            type="textarea"
            :placeholder="$t({ en: 'Describe the sound...', zh: '描述声音...' })"
          />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>{{ $t({ en: 'Duration (seconds)', zh: '时长（秒）' }) }}</label>
            <UITextInput v-model:value="durationStr" type="text" />
          </div>
        </div>
      </div>
      <div class="stage-actions">
        <UIButton type="primary" size="large" @click="handleGenerate">
          {{ $t({ en: 'Generate', zh: '生成' }) }}
        </UIButton>
      </div>
    </div>

    <!-- Step 3: Generating audio -->
    <div v-else-if="stage === 'generating'" class="stage-container">
      <UILoading />
      <p class="stage-message">
        {{ $t({ en: 'Generating sound audio...', zh: '正在生成声音音频...' }) }}
      </p>
    </div>

    <!-- Step 4: Preview and trim -->
    <div v-else-if="stage === 'preview'" class="stage-container">
      <h3 class="stage-title">{{ $t({ en: 'Generated Sound', zh: '生成的声音' }) }}</h3>
      <div class="audio-container">
        <audio :src="generatedAudioUrl" controls class="preview-audio" />
      </div>
      <div class="trim-controls">
        <label>{{ $t({ en: 'Trim Duration (seconds)', zh: '裁剪时长（秒）' }) }}</label>
        <UITextInput v-model:value="trimDurationStr" type="text" />
        <p class="hint">
          {{ $t({ en: 'Adjust duration if needed (original duration will be used if not specified)', zh: '如需要可调整时长（如未指定将使用原始时长）' }) }}
        </p>
      </div>
      <div class="stage-actions">
        <UIButton type="boring" size="large" @click="handleRegenerate">
          {{ $t({ en: 'Regenerate', zh: '重新生成' }) }}
        </UIButton>
        <UIButton type="primary" size="large" :loading="isCreating" @click="handleConfirm">
          {{ $t({ en: 'Confirm', zh: '确认' }) }}
        </UIButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { UIButton, UITextInput, UILoading } from '@/components/ui'
import { enrichSettings, generateSoundAudio, type SoundSettings } from '@/apis/assets-gen'
import { AssetType } from '@/apis/asset'
import type { Project } from '@/models/project'
import { Sound } from '@/models/sound'
import type { AssetSettings } from '@/models/common/asset'
import { fromBlob } from '@/models/common/file'
import { getSoundName } from '@/models/common/asset-name'

const props = defineProps<{
  project: Project
  settings?: AssetSettings
}>()

const emit = defineEmits<{
  generated: [sound: Sound]
}>()

type Stage = 'enriching' | 'editing' | 'generating' | 'preview'

const stage = ref<Stage>('enriching')
const editableSettings = reactive<SoundSettings>({
  artStyle: null,
  perspective: null,
  projectDescription: null,
  description: null,
  name: undefined,
  duration: 3
})
const generatedAudioUrl = ref<string>('')
const trimDuration = ref<number | null>(null)
const isCreating = ref(false)

const description = computed({
  get: () => editableSettings.description ?? '',
  set: (value: string) => {
    editableSettings.description = value
  }
})

const durationStr = computed({
  get: () => editableSettings.duration?.toString() ?? '3',
  set: (value: string) => {
    const parsed = parseFloat(value)
    if (!isNaN(parsed) && parsed > 0) {
      editableSettings.duration = parsed
    }
  }
})

const trimDurationStr = computed({
  get: () => trimDuration.value?.toString() ?? '',
  set: (value: string) => {
    if (value === '') {
      trimDuration.value = null
      return
    }
    const parsed = parseFloat(value)
    if (!isNaN(parsed) && parsed > 0) {
      trimDuration.value = parsed
    }
  }
})

onMounted(async () => {
  // Step 1: Enrich settings
  const enriched = await enrichSettings(props.settings ?? {}, AssetType.Sound)
  Object.assign(editableSettings, enriched)
  stage.value = 'editing'
})

async function handleGenerate() {
  stage.value = 'generating'
  try {
    // Step 3: Generate audio
    generatedAudioUrl.value = await generateSoundAudio(editableSettings)
    stage.value = 'preview'
  } catch (error) {
    console.error('Failed to generate sound audio:', error)
    stage.value = 'editing'
    throw error
  }
}

function handleRegenerate() {
  stage.value = 'editing'
}

async function handleConfirm() {
  isCreating.value = true
  try {
    // Step 5: Create sound from generated audio
    const response = await fetch(generatedAudioUrl.value)
    const blob = await response.blob()
    const soundName = getSoundName(props.project)
    
    // Determine file extension from blob type
    const extension = blob.type.includes('mp3') ? 'mp3' : 
                     blob.type.includes('wav') ? 'wav' : 
                     blob.type.includes('ogg') ? 'ogg' : 'mp3'
    
    const file = fromBlob(`${soundName}.${extension}`, blob)
    const sound = await Sound.create(soundName, file)

    emit('generated', sound)
  } catch (error) {
    console.error('Failed to create sound:', error)
    throw error
  } finally {
    isCreating.value = false
  }
}
</script>

<style lang="scss" scoped>
.sound-generator {
  display: flex;
  flex-direction: column;
  padding: var(--ui-gap-large);
  min-height: 436px;
}

.stage-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--ui-gap-middle);
}

.stage-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ui-color-title);
  margin: 0 0 var(--ui-gap-middle) 0;
  align-self: flex-start;
}

.stage-message {
  font-size: 14px;
  color: var(--ui-color-grey-700);
  margin: 0;
}

.settings-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-middle);
}

.form-row {
  display: flex;
  gap: var(--ui-gap-middle);

  .form-group {
    flex: 1;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 14px;
    font-weight: 500;
    color: var(--ui-color-title);
  }
}

.audio-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--ui-gap-large);
  background: var(--ui-color-grey-100);
  border-radius: var(--ui-border-radius-2);
}

.preview-audio {
  width: 100%;
  max-width: 500px;
}

.trim-controls {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 14px;
    font-weight: 500;
    color: var(--ui-color-title);
  }

  .hint {
    font-size: 12px;
    color: var(--ui-color-grey-600);
    margin: 0;
  }
}

.stage-actions {
  display: flex;
  gap: var(--ui-gap-middle);
  margin-top: var(--ui-gap-middle);
  align-self: flex-end;
}
</style>
