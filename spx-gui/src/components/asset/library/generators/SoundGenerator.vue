<template>
  <div class="sound-generator">
    <!-- Step header -->
    <div class="step-header">
      <template v-if="stage === 'input-brief' || stage === 'enriching'">
        <span class="step-number">{{ $t({ en: 'Step 1', zh: '第 1 步' }) }}</span>
        <span class="step-title">{{ $t({ en: 'Describe the Sound', zh: '描述声音' }) }}</span>
      </template>
      <template v-else-if="stage === 'editing' || stage === 'generating'">
        <span class="step-number">{{ $t({ en: 'Step 2', zh: '第 2 步' }) }}</span>
        <span class="step-title">{{ $t({ en: 'Edit Sound Details', zh: '编辑声音细节' }) }}</span>
      </template>
      <template v-else-if="stage === 'preview'">
        <span class="step-number">{{ $t({ en: 'Step 3', zh: '第 3 步' }) }}</span>
        <span class="step-title">{{ $t({ en: 'Preview & Confirm', zh: '预览并确认' }) }}</span>
      </template>
    </div>

    <!-- Brief input (shown in input-brief and enriching stages) -->
    <form
      v-if="stage === 'input-brief' || stage === 'enriching'"
      class="settings-section settings-section--centered"
      @submit.prevent="handleSubmitBrief"
    >
      <div class="form-group">
        <UITextInput
          v-model:value="brief"
          :placeholder="$t({ en: 'Briefly describe the sound...', zh: '简要描述声音...' })"
          :disabled="stage === 'enriching'"
        />
      </div>
      <div class="form-row">
        <div class="form-row-actions">
          <UIButton v-if="stage === 'input-brief'" type="primary" size="medium" html-type="submit">
            {{ $t({ en: 'Next', zh: '下一步' }) }}
          </UIButton>
        </div>
      </div>
      <UILoading v-if="stage === 'enriching'" cover />
    </form>

    <!-- Detailed settings form (shown in editing, generating, preview stages) -->
    <div v-else class="settings-section" :class="{ 'settings-section--compact': stage === 'generating' }">
      <div class="form-group">
        <UITextInput
          v-model:value="description"
          type="textarea"
          :placeholder="$t({ en: 'Describe the sound effect or music...', zh: '描述声音效果或音乐...' })"
          :disabled="stage === 'generating'"
          :rows="2"
        />
      </div>
      <div class="form-row">
        <div class="form-row-item">
          <div class="form-group">
            <label>{{ $t({ en: 'Name', zh: '名称' }) }}</label>
            <UITextInput v-model:value="soundName" :disabled="stage === 'generating'" style="width: 120px" />
          </div>
        </div>
        <div class="form-row-item">
          <div class="form-group">
            <label>{{ $t({ en: 'Duration', zh: '时长' }) }}</label>
            <UITextInput v-model:value="durationStr" :disabled="stage === 'generating'" style="width: 80px" />
          </div>
        </div>
        <div class="form-row-item">
          <div class="form-group">
            <label>{{ $t({ en: 'Category', zh: '类别' }) }}</label>
            <SoundCategoryInput v-model:value="category" :disabled="stage === 'generating'" />
          </div>
        </div>
        <div class="form-row-actions">
          <UIButton v-if="stage === 'editing'" type="primary" size="medium" @click="handleGenerate">
            {{ $t({ en: 'Generate', zh: '生成' }) }}
          </UIButton>
          <UIButton v-else-if="stage === 'preview'" type="primary" size="medium" @click="handleGenerate">
            {{ $t({ en: 'Regenerate', zh: '重新生成' }) }}
          </UIButton>
        </div>
      </div>
    </div>

    <!-- Preview container (shown in all stages except input-brief and enriching) -->
    <div v-if="stage !== 'input-brief' && stage !== 'enriching'" class="preview-container">
      <div v-if="stage === 'generating'" class="preview-loading">
        <UILoading />
        <p class="stage-message">
          {{ $t({ en: 'Generating sound...', zh: '正在生成声音...' }) }}
        </p>
      </div>
      <div v-else-if="generatedAudioUrl" class="preview-audio-wrapper">
        <audio ref="audioRef" :src="generatedAudioUrl" controls class="preview-audio" />
      </div>
      <div v-else class="preview-placeholder">
        <span class="preview-placeholder-text">{{ $t({ en: 'Preview', zh: '预览' }) }}</span>
      </div>
    </div>

    <!-- Action buttons -->
    <div v-if="stage === 'preview'" class="stage-actions">
      <UIButton type="primary" size="large" :loading="isCreating" @click="handleConfirm">
        {{ $t({ en: 'Adopt', zh: '采用' }) }}
      </UIButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { UIButton, UITextInput, UILoading } from '@/components/ui'
import { enrichSettings, generateSoundAudio, type SoundSettings } from '@/apis/assets-gen'
import { AssetType } from '@/apis/asset'
import type { Project } from '@/models/project'
import { Sound } from '@/models/sound'
import type { AssetSettings, SoundCategory } from '@/models/common/asset'
import { fromBlob } from '@/models/common/file'
import { getSoundName } from '@/models/common/asset-name'
import SoundCategoryInput from './SoundCategoryInput.vue'

const props = defineProps<{
  project: Project
  settings?: AssetSettings
  /** Brief description */
  brief?: string
}>()

const emit = defineEmits<{
  generated: [sound: Sound]
}>()

type Stage = 'input-brief' | 'enriching' | 'editing' | 'generating' | 'preview'

const stage = ref<Stage>(props.brief ? 'enriching' : 'input-brief')
const brief = ref(props.brief ?? '')
const editableSettings = reactive<SoundSettings>({
  artStyle: null,
  perspective: null,
  projectDescription: props.settings?.projectDescription ?? null,
  description: props.settings?.description ?? null,
  category: props.settings?.category ?? null,
  name: undefined,
  duration: 3
})
const generatedAudioUrl = ref<string>('')
const isCreating = ref(false)
const audioRef = ref<HTMLAudioElement>()

const description = computed({
  get: () => editableSettings.description ?? '',
  set: (value: string) => {
    editableSettings.description = value
  }
})

const soundName = computed({
  get: () => editableSettings.name ?? '',
  set: (value: string) => {
    editableSettings.name = value
  }
})

const durationStr = computed({
  get: () => (editableSettings.duration ? `${editableSettings.duration}s` : ''),
  set: (value: string) => {
    const numStr = value.replace(/s$/, '')
    const parsed = parseFloat(numStr)
    if (!isNaN(parsed) && parsed > 0) {
      editableSettings.duration = parsed
    }
  }
})

const category = computed({
  get: () => editableSettings.category,
  set: (value: string) => {
    editableSettings.category = value as SoundCategory
  }
})

async function handleSubmitBrief() {
  stage.value = 'enriching'
  await enrichSettingsWithBrief()
}

async function enrichSettingsWithBrief() {
  const settingsToEnrich = {
    ...props.settings,
    description: brief.value || props.brief
  }
  const enriched = await enrichSettings(settingsToEnrich, AssetType.Sound)
  Object.assign(editableSettings, enriched)
  stage.value = 'editing'
}

async function handleGenerate() {
  stage.value = 'generating'
  try {
    generatedAudioUrl.value = await generateSoundAudio(editableSettings)
    stage.value = 'preview'
  } catch (error) {
    console.error('Failed to generate sound:', error)
    stage.value = 'editing'
    throw error
  }
}

async function handleConfirm() {
  isCreating.value = true
  try {
    const response = await fetch(generatedAudioUrl.value)
    const blob = await response.blob()
    const finalName = editableSettings.name || getSoundName(props.project)

    // Determine file extension from blob type
    const extension = blob.type.includes('mp3')
      ? 'mp3'
      : blob.type.includes('wav')
        ? 'wav'
        : blob.type.includes('ogg')
          ? 'ogg'
          : 'mp3'

    const file = fromBlob(`${finalName}.${extension}`, blob)
    const sound = await Sound.create(finalName, file)

    emit('generated', sound)
  } catch (error) {
    console.error('Failed to create sound:', error)
    throw error
  } finally {
    isCreating.value = false
  }
}

// Initialize if brief is provided
if (props.brief) {
  enrichSettingsWithBrief()
}
</script>

<style lang="scss" scoped>
.sound-generator {
  display: flex;
  flex-direction: column;
  min-height: 436px;
  gap: var(--ui-gap-middle);
}

.step-header {
  display: flex;
  align-items: center;
  gap: var(--ui-gap-small);
  padding-bottom: var(--ui-gap-small);
}

.step-number {
  font-size: 12px;
  font-weight: 600;
  color: var(--ui-color-primary-main);
  background: var(--ui-color-primary-100);
  padding: 2px 8px;
  border-radius: var(--ui-border-radius-1);
}

.step-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ui-color-title);
}

.settings-section {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-middle);

  &--compact {
    opacity: 0.6;
    pointer-events: none;
  }

  &--centered {
    flex: 1;
    justify-content: center;
  }
}

.stage-message {
  font-size: 14px;
  color: var(--ui-color-grey-700);
  margin: 0;
}

.form-row {
  display: flex;
  gap: var(--ui-gap-middle);

  .form-row-item {
    flex: 0 0 auto;

    .form-group {
      flex-direction: row;
      align-items: center;

      label {
        flex-shrink: 0;
        margin-right: var(--ui-gap-small);
      }
    }
  }

  .form-row-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
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

.preview-container {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--ui-gap-large);
  background: var(--ui-color-grey-100);
  border-radius: var(--ui-border-radius-2);
}

.preview-audio-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-audio {
  width: 100%;
  max-width: 500px;
}

.preview-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.preview-placeholder-text {
  font-size: 16px;
  color: var(--ui-color-grey-500);
}

.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ui-gap-middle);
}

.stage-actions {
  display: flex;
  gap: var(--ui-gap-middle);
  justify-content: flex-end;
}
</style>
