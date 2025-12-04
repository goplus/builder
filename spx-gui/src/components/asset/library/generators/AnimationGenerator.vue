<template>
  <div class="animation-generator">
    <!-- Back button -->
    <div v-if="showBack" class="back-header">
      <button class="back-button" @click="emit('back')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10 12L6 8L10 4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        {{ $t({ en: 'Back', zh: '返回' }) }}
      </button>
    </div>

    <!-- Step header -->
    <div class="step-header">
      <template v-if="stage === 'input-brief' || stage === 'enriching'">
        <span class="step-number">{{ $t({ en: 'Step 1', zh: '第 1 步' }) }}</span>
        <span class="step-title">{{ $t({ en: 'Describe the Animation', zh: '描述动画' }) }}</span>
      </template>
      <template v-else-if="stage === 'editing' || stage === 'generating-frame'">
        <span class="step-number">{{ $t({ en: 'Step 2', zh: '第 2 步' }) }}</span>
        <span class="step-title">{{ $t({ en: 'Edit Animation Details', zh: '编辑动画细节' }) }}</span>
      </template>
      <template v-else-if="stage === 'preview-frame'">
        <span class="step-number">{{ $t({ en: 'Step 3', zh: '第 3 步' }) }}</span>
        <span class="step-title">{{ $t({ en: 'Preview Reference Frame', zh: '预览参考帧' }) }}</span>
      </template>
      <template v-else-if="stage === 'generating-video'">
        <span class="step-number">{{ $t({ en: 'Step 4', zh: '第 4 步' }) }}</span>
        <span class="step-title">{{ $t({ en: 'Generate Animation Video', zh: '生成动画视频' }) }}</span>
      </template>
      <template v-else-if="stage === 'preview-video'">
        <span class="step-number">{{ $t({ en: 'Step 5', zh: '第 5 步' }) }}</span>
        <span class="step-title">{{ $t({ en: 'Preview & Trim Video', zh: '预览并裁剪视频' }) }}</span>
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
          :placeholder="$t({ en: 'Briefly describe the animation...', zh: '简要描述动画...' })"
          :disabled="stage === 'enriching'"
        />
      </div>

      <!-- Reference costume selector -->
      <div v-if="props.sprite.costumes.length > 0" class="form-group">
        <label>{{ $t({ en: 'Reference Costume', zh: '参考造型' }) }}</label>
        <div class="costume-selector">
          <div
            v-for="costume in props.sprite.costumes"
            :key="costume.id"
            class="costume-option"
            :class="{ 'costume-option--selected': selectedCostumeId === costume.id }"
            @click="selectedCostumeId = costume.id"
          >
            <CostumePreview :costume="costume" class="costume-preview" />
            <span class="costume-name">{{ costume.name }}</span>
          </div>
        </div>
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

    <!-- Detailed settings form (shown in editing, generating-frame, preview-frame, generating-video stages) -->
    <div
      v-else-if="stage !== 'preview-video'"
      class="settings-section"
      :class="{ 'settings-section--compact': isGenerating }"
    >
      <div class="form-group">
        <UITextInput
          v-model:value="description"
          type="textarea"
          :placeholder="$t({ en: 'Describe the animation...', zh: '描述动画...' })"
          :disabled="isGenerating"
          :rows="2"
        />
      </div>
      <div class="form-row">
        <div v-if="selectedCostume" class="form-row-item">
          <div class="form-group">
            <label>{{ $t({ en: 'Reference', zh: '参考' }) }}</label>
            <div class="reference-costume-display">
              <CostumePreview :costume="selectedCostume" class="reference-costume-preview" />
            </div>
          </div>
        </div>
        <div class="form-row-item">
          <div class="form-group">
            <label>{{ $t({ en: 'Name', zh: '名称' }) }}</label>
            <UITextInput v-model:value="animationName" :disabled="isGenerating" style="width: 120px" />
          </div>
        </div>
        <div class="form-row-item">
          <div class="form-group">
            <label>{{ $t({ en: 'Art Style', zh: '艺术风格' }) }}</label>
            <ArtStyleInput v-model:value="artStyle" :disabled="isGenerating" />
          </div>
        </div>
        <div class="form-row-item">
          <div class="form-group">
            <label>{{ $t({ en: 'Perspective', zh: '游戏视角' }) }}</label>
            <PerspectiveInput v-model:value="perspective" :disabled="isGenerating" />
          </div>
        </div>
        <div class="form-row-actions">
          <UIButton
            v-if="stage === 'editing' || stage === 'preview-frame'"
            type="primary"
            size="medium"
            @click="handleGenerateFrame"
          >
            {{ stage === 'editing' ? $t({ en: 'Generate', zh: '生成' }) : $t({ en: 'Regenerate', zh: '重新生成' }) }}
          </UIButton>
        </div>
      </div>
    </div>

    <!-- Preview container (shown in all stages except enriching) -->
    <div v-if="stage !== 'input-brief' && stage !== 'enriching'" class="preview-container">
      <!-- Generating frame -->
      <div v-if="stage === 'generating-frame'" class="preview-loading">
        <UILoading />
        <p class="stage-message">
          {{ $t({ en: 'Generating reference frame...', zh: '正在生成参考帧...' }) }}
        </p>
      </div>

      <!-- Preview frame -->
      <template v-else-if="stage === 'preview-frame'">
        <img :src="referenceFrameUrl" alt="Reference frame" class="preview-image" />
      </template>

      <!-- Generating video -->
      <div v-if="stage === 'generating-video'" class="preview-loading">
        <UILoading />
        <p class="stage-message">
          {{ $t({ en: 'Generating animation video...', zh: '正在生成动画视频...' }) }}
        </p>
        <UIButton type="boring" size="medium" @click="handleHide">
          {{ $t({ en: 'Hide', zh: '收起' }) }}
        </UIButton>
      </div>

      <!-- Preview video with trimming -->
      <template v-else-if="stage === 'preview-video'">
        <div class="video-preview-wrapper">
          <video
            ref="videoRef"
            :src="generatedVideoUrl"
            class="preview-video"
            @loadedmetadata="handleVideoLoaded"
            @timeupdate="handleTimeUpdate"
          />
          <div class="video-controls">
            <button class="play-button" @click="togglePlayPause">
              <svg
                v-if="!isPlaying"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            </button>
            <div class="trim-slider-container">
              <div class="trim-slider">
                <div class="trim-track" :style="trimTrackStyle" />
                <input
                  type="range"
                  class="trim-handle trim-handle--start"
                  :min="0"
                  :max="videoDuration"
                  :step="0.01"
                  :value="trimStart"
                  @input="handleTrimStartChange"
                />
                <input
                  type="range"
                  class="trim-handle trim-handle--end"
                  :min="0"
                  :max="videoDuration"
                  :step="0.01"
                  :value="trimEnd"
                  @input="handleTrimEndChange"
                />
                <div class="playhead" :style="playheadStyle" />
              </div>
              <div class="trim-time-labels">
                <span>{{ formatTime(trimStart) }}</span>
                <span>{{ formatTime(trimEnd) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Placeholder -->
      <div v-else-if="stage === 'editing'" class="preview-placeholder">
        <span class="preview-placeholder-text">{{ $t({ en: 'Preview', zh: '预览' }) }}</span>
      </div>

      <!-- Edit button for frame preview -->
      <button
        v-if="stage === 'preview-frame' && referenceFrameUrl && !showModificationForm"
        class="preview-edit-button"
        @click="showModificationForm = true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      <!-- Modification form (floating over preview) -->
      <div v-if="showModificationForm && stage === 'preview-frame'" class="modification-form-overlay">
        <div class="modification-form">
          <div class="form-group">
            <label>{{ $t({ en: 'Modification Instructions', zh: '修改指令' }) }}</label>
            <UITextInput
              v-model:value="modificationInstruction"
              type="textarea"
              :placeholder="$t({ en: 'Describe what you want to modify...', zh: '描述您想要修改的内容...' })"
              :rows="3"
            />
          </div>
          <div class="modification-actions">
            <UIButton type="boring" size="medium" @click="cancelModification">
              {{ $t({ en: 'Cancel', zh: '取消' }) }}
            </UIButton>
            <UIButton
              type="primary"
              size="medium"
              :disabled="!modificationInstruction.trim()"
              @click="submitModification"
            >
              {{ $t({ en: 'Submit', zh: '提交' }) }}
            </UIButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Action buttons -->
    <div v-if="stage === 'preview-frame'" class="stage-actions">
      <UIButton type="primary" size="large" @click="handleContinueToVideo">
        {{ $t({ en: 'Continue', zh: '继续' }) }}
      </UIButton>
    </div>

    <div v-if="stage === 'preview-video'" class="stage-actions">
      <UIButton type="boring" size="large" @click="handleBackToFrame">
        {{ $t({ en: 'Back', zh: '返回' }) }}
      </UIButton>
      <UIButton type="primary" size="large" :loading="isCreating" @click="handleConfirm">
        {{ $t({ en: 'Adopt', zh: '采用' }) }}
      </UIButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { UIButton, UITextInput, UILoading } from '@/components/ui'
import {
  enrichSettings,
  generateAnimationFrame,
  modifyAnimationFrame,
  submitAnimationVideoTask,
  getAnimationVideoTaskStatus,
  getFramesFromVideo,
  type AnimationSettings
} from '@/apis/assets-gen'
import type { Sprite } from '@/models/sprite'
import { Animation } from '@/models/animation'
import { Costume } from '@/models/costume'
import type { AssetSettings } from '@/models/common/asset'
import { createFileWithWebUrl } from '@/models/common/cloud'
import { getAnimationName } from '@/models/common/asset-name'
import { useFileUrl } from '@/utils/file'
import ArtStyleInput from './ArtStyleInput.vue'
import PerspectiveInput from './PerspectiveInput.vue'
import CostumePreview from './CostumePreview.vue'

export type AnimationGeneratorState = {
  stage: Stage
  brief: string
  settings: AnimationSettings
  selectedCostumeId: string | null
  referenceFrameUrl: string
  generatedVideoUrl: string
  videoTaskId: string | null
  trimStart: number
  trimEnd: number
  videoDuration: number
}

const props = defineProps<{
  sprite: Sprite
  settings?: AssetSettings
  /** Brief description */
  brief?: string
  /** Animation name (when used within SpriteGenerator) */
  initialAnimationName?: string
  /** Whether to show the back button */
  showBack?: boolean
  /** Saved state for restoration */
  savedState?: AnimationGeneratorState
}>()

const emit = defineEmits<{
  generated: [animation: Animation]
  back: []
  hide: [state: AnimationGeneratorState]
}>()

type Stage =
  | 'input-brief'
  | 'enriching'
  | 'editing'
  | 'generating-frame'
  | 'preview-frame'
  | 'generating-video'
  | 'preview-video'

const stage = ref<Stage>(props.brief ? 'enriching' : 'input-brief')
const brief = ref(props.brief ?? '')
const editableSettings = reactive<AnimationSettings>({
  artStyle: props.settings?.artStyle ?? null,
  perspective: props.settings?.perspective ?? null,
  projectDescription: props.settings?.projectDescription ?? null,
  description: props.settings?.description ?? null,
  category: props.settings?.category ?? null,
  spriteName: props.sprite.name,
  name: props.initialAnimationName ?? undefined
})

// Reference costume selection - default to sprite's default costume
const selectedCostumeId = ref<string | null>(props.sprite.defaultCostume?.id ?? null)

const selectedCostume = computed(() => {
  if (selectedCostumeId.value == null) return null
  return props.sprite.costumes.find((c) => c.id === selectedCostumeId.value) ?? null
})

// Get URL for selected costume image
const [selectedCostumeImageUrl] = useFileUrl(() => selectedCostume.value?.img ?? null)

const referenceFrameUrl = ref<string>('')
const generatedVideoUrl = ref<string>('')
const videoTaskId = ref<string | null>(null)
const isCreating = ref(false)
const showModificationForm = ref(false)
const modificationInstruction = ref('')

// Video playback and trimming state
const videoRef = ref<HTMLVideoElement | null>(null)
const videoDuration = ref(0)
const currentTime = ref(0)
const trimStart = ref(0)
const trimEnd = ref(0)
const isPlaying = ref(false)

const isGenerating = computed(() => stage.value === 'generating-frame' || stage.value === 'generating-video')

const description = computed({
  get: () => editableSettings.description ?? '',
  set: (value: string) => {
    editableSettings.description = value
  }
})

const animationName = computed({
  get: () => editableSettings.name ?? '',
  set: (value: string) => {
    editableSettings.name = value
  }
})

const artStyle = computed({
  get: () => editableSettings.artStyle,
  set: (value: string) => {
    editableSettings.artStyle = value
  }
})

const perspective = computed({
  get: () => editableSettings.perspective,
  set: (value: string) => {
    editableSettings.perspective = value
  }
})

const trimTrackStyle = computed(() => {
  if (videoDuration.value === 0) return {}
  const left = (trimStart.value / videoDuration.value) * 100
  const width = ((trimEnd.value - trimStart.value) / videoDuration.value) * 100
  return {
    left: `${left}%`,
    width: `${width}%`
  }
})

const playheadStyle = computed(() => {
  if (videoDuration.value === 0) return {}
  const left = (currentTime.value / videoDuration.value) * 100
  return {
    left: `${left}%`
  }
})

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

async function handleSubmitBrief() {
  stage.value = 'enriching'
  await enrichSettingsWithBrief()
}

async function enrichSettingsWithBrief() {
  const settingsToEnrich = {
    ...props.settings,
    description: brief.value || props.brief
  }
  const enriched = await enrichSettings(settingsToEnrich, 'animation')
  Object.assign(editableSettings, enriched)
  stage.value = 'editing'
}

async function handleGenerateFrame() {
  stage.value = 'generating-frame'
  try {
    // Get reference image URL from selected costume
    const referenceImageUrl = selectedCostumeImageUrl.value ?? ''

    // Generate animation frame using the reference costume image
    referenceFrameUrl.value = await generateAnimationFrame(
      {
        ...editableSettings,
        spriteName: props.sprite.name
      },
      referenceImageUrl
    )
    stage.value = 'preview-frame'
    showModificationForm.value = false
    modificationInstruction.value = ''
  } catch (error) {
    console.error('Failed to generate reference frame:', error)
    stage.value = 'editing'
    throw error
  }
}

function cancelModification() {
  showModificationForm.value = false
  modificationInstruction.value = ''
}

async function submitModification() {
  if (!modificationInstruction.value.trim()) return

  stage.value = 'generating-frame'
  showModificationForm.value = false

  try {
    referenceFrameUrl.value = await modifyAnimationFrame(referenceFrameUrl.value, modificationInstruction.value, {
      ...editableSettings,
      spriteName: props.sprite.name
    })
    stage.value = 'preview-frame'
    modificationInstruction.value = ''
  } catch (error) {
    console.error('Failed to modify reference frame:', error)
    stage.value = 'preview-frame'
    showModificationForm.value = true
    throw error
  }
}

// Flag to stop polling when hidden
const isPollingActive = ref(false)

async function handleContinueToVideo() {
  stage.value = 'generating-video'
  try {
    // Submit video generation task (only if we don't have a task already)
    if (videoTaskId.value == null) {
      videoTaskId.value = await submitAnimationVideoTask(editableSettings, referenceFrameUrl.value)
    }

    // Start polling
    await pollVideoTaskStatus()
  } catch (error) {
    console.error('Failed to generate animation video:', error)
    stage.value = 'preview-frame'
    throw error
  }
}

async function pollVideoTaskStatus() {
  if (videoTaskId.value == null) return

  isPollingActive.value = true
  const pollInterval = 2000 // Poll every 2 seconds

  while (isPollingActive.value) {
    const status = await getAnimationVideoTaskStatus(videoTaskId.value)

    if (status.status === 'completed' && status.resultUrl != null) {
      generatedVideoUrl.value = status.resultUrl
      videoTaskId.value = null
      stage.value = 'preview-video'
      isPollingActive.value = false
      return
    } else if (status.status === 'failed') {
      videoTaskId.value = null
      isPollingActive.value = false
      throw new Error(status.error || 'Video generation failed')
    } else {
      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }
  }
}

function handleBackToFrame() {
  stage.value = 'preview-frame'
  // Reset video state
  isPlaying.value = false
  if (videoRef.value) {
    videoRef.value.pause()
  }
}

function handleVideoLoaded() {
  if (videoRef.value) {
    videoDuration.value = videoRef.value.duration
    trimEnd.value = videoRef.value.duration
  }
}

function handleTimeUpdate() {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime
    // Loop within trim range
    if (currentTime.value >= trimEnd.value) {
      videoRef.value.currentTime = trimStart.value
    }
  }
}

function togglePlayPause() {
  if (!videoRef.value) return

  if (isPlaying.value) {
    videoRef.value.pause()
    isPlaying.value = false
  } else {
    // Start from trim start if current time is outside trim range
    if (videoRef.value.currentTime < trimStart.value || videoRef.value.currentTime >= trimEnd.value) {
      videoRef.value.currentTime = trimStart.value
    }
    videoRef.value.play()
    isPlaying.value = true
  }
}

function handleTrimStartChange(event: Event) {
  const value = parseFloat((event.target as HTMLInputElement).value)
  trimStart.value = Math.min(value, trimEnd.value - 0.1)
  if (videoRef.value && videoRef.value.currentTime < trimStart.value) {
    videoRef.value.currentTime = trimStart.value
  }
}

function handleTrimEndChange(event: Event) {
  const value = parseFloat((event.target as HTMLInputElement).value)
  trimEnd.value = Math.max(value, trimStart.value + 0.1)
  if (videoRef.value && videoRef.value.currentTime > trimEnd.value) {
    videoRef.value.currentTime = trimEnd.value
  }
}

function getCurrentState(): AnimationGeneratorState {
  return {
    stage: stage.value,
    brief: brief.value,
    settings: { ...editableSettings },
    selectedCostumeId: selectedCostumeId.value,
    referenceFrameUrl: referenceFrameUrl.value,
    generatedVideoUrl: generatedVideoUrl.value,
    videoTaskId: videoTaskId.value,
    trimStart: trimStart.value,
    trimEnd: trimEnd.value,
    videoDuration: videoDuration.value
  }
}

function handleHide() {
  // Stop polling but don't cancel the task
  isPollingActive.value = false
  emit('hide', getCurrentState())
}

async function handleConfirm() {
  isCreating.value = true
  try {
    // Calculate frame interval based on trim duration
    const trimDuration = trimEnd.value - trimStart.value
    const targetFrameCount = Math.max(4, Math.min(30, Math.ceil(trimDuration * 10)))
    const interval = (trimDuration * 1000) / targetFrameCount

    // Get frames from video
    const frameUrls = await getFramesFromVideo(generatedVideoUrl.value, interval)

    // Create costumes from frames
    const costumes: Costume[] = []
    for (let i = 0; i < frameUrls.length; i++) {
      const frameUrl = frameUrls[i]
      const file = createFileWithWebUrl(frameUrl)
      const costume = await Costume.create(`frame${i}`, file)
      await costume.autoFit()
      costumes.push(costume)
    }

    // Create animation with costumes
    const name = getAnimationName(props.sprite, editableSettings.name || 'animation')
    const animation = Animation.create(name, costumes, {
      duration: trimDuration
    })

    emit('generated', animation)
  } catch (error) {
    console.error('Failed to create animation:', error)
    throw error
  } finally {
    isCreating.value = false
  }
}

// Initialize from savedState or brief
function initializeFromSavedState() {
  if (props.savedState == null) return false

  const saved = props.savedState
  stage.value = saved.stage
  brief.value = saved.brief
  Object.assign(editableSettings, saved.settings)
  selectedCostumeId.value = saved.selectedCostumeId
  referenceFrameUrl.value = saved.referenceFrameUrl
  generatedVideoUrl.value = saved.generatedVideoUrl
  videoTaskId.value = saved.videoTaskId
  trimStart.value = saved.trimStart
  trimEnd.value = saved.trimEnd
  videoDuration.value = saved.videoDuration

  // If we were generating video, resume polling
  if (saved.stage === 'generating-video' && saved.videoTaskId != null) {
    pollVideoTaskStatus()
  }

  return true
}

// Initialize
if (!initializeFromSavedState()) {
  // No saved state, initialize normally
  if (props.brief) {
    enrichSettingsWithBrief()
  }
}
</script>

<style lang="scss" scoped>
.animation-generator {
  display: flex;
  flex-direction: column;
  min-height: 436px;
  gap: var(--ui-gap-middle);
}

.back-header {
  display: flex;
  align-items: center;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: none;
  border: none;
  border-radius: var(--ui-border-radius-1);
  cursor: pointer;
  font-size: 14px;
  color: var(--ui-color-grey-700);
  transition: all 0.2s;

  &:hover {
    background: var(--ui-color-grey-100);
    color: var(--ui-color-grey-900);
  }

  svg {
    flex-shrink: 0;
  }
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

.stage-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--ui-gap-middle);
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

.costume-selector {
  display: flex;
  gap: var(--ui-gap-small);
  flex-wrap: wrap;
}

.costume-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border: 2px solid transparent;
  border-radius: var(--ui-border-radius-1);
  cursor: pointer;
  transition: all 0.2s;
  background: var(--ui-color-grey-100);

  &:hover {
    border-color: var(--ui-color-grey-400);
  }

  &--selected {
    border-color: var(--ui-color-primary-main);
    background: var(--ui-color-primary-100);
  }

  .costume-preview {
    width: 48px;
    height: 48px;
  }

  .costume-name {
    font-size: 12px;
    color: var(--ui-color-grey-700);
    max-width: 64px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
  }
}

.reference-costume-display {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--ui-color-grey-100);
  border-radius: var(--ui-border-radius-1);
  overflow: hidden;
}

.reference-costume-preview {
  width: 100%;
  height: 100%;
}

.preview-container {
  position: relative;
  width: 100%;
  min-height: 300px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--ui-gap-large);
  background: var(--ui-color-grey-100);
  border-radius: var(--ui-border-radius-2);
}

.preview-image {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
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

.preview-edit-button {
  position: absolute;
  top: var(--ui-gap-middle);
  right: var(--ui-gap-middle);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ui-color-white);
  border: 1px solid var(--ui-color-grey-300);
  border-radius: var(--ui-border-radius-1);
  cursor: pointer;
  transition: all 0.2s;
  color: var(--ui-color-grey-700);

  &:hover {
    background: var(--ui-color-grey-50);
    border-color: var(--ui-color-grey-400);
    color: var(--ui-color-grey-900);
  }

  svg {
    width: 16px;
    height: 16px;
  }
}

.modification-form-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: var(--ui-border-radius-2);
  padding: var(--ui-gap-large);
}

.modification-form {
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-middle);
  padding: var(--ui-gap-large);
  background: var(--ui-color-grey-100);
  border-radius: var(--ui-border-radius-2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modification-actions {
  display: flex;
  gap: var(--ui-gap-middle);
  justify-content: flex-end;
}

.stage-actions {
  display: flex;
  gap: var(--ui-gap-middle);
  justify-content: flex-end;
}

// Video preview styles
.video-preview-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: var(--ui-gap-middle);
}

.preview-video {
  max-width: 100%;
  max-height: 240px;
  object-fit: contain;
  border-radius: var(--ui-border-radius-1);
}

.video-controls {
  display: flex;
  align-items: center;
  gap: var(--ui-gap-middle);
  width: 100%;
}

.play-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ui-color-primary-main);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: white;
  transition: background 0.2s;
  flex-shrink: 0;

  &:hover {
    background: var(--ui-color-primary-600);
  }

  svg {
    width: 20px;
    height: 20px;
  }
}

.trim-slider-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trim-slider {
  position: relative;
  height: 24px;
  background: var(--ui-color-grey-300);
  border-radius: 4px;
}

.trim-track {
  position: absolute;
  top: 0;
  height: 100%;
  background: var(--ui-color-primary-200);
  border-radius: 4px;
}

.trim-handle {
  position: absolute;
  top: 0;
  width: 100%;
  height: 100%;
  appearance: none;
  background: transparent;
  pointer-events: none;
  margin: 0;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 24px;
    background: var(--ui-color-primary-main);
    border-radius: 2px;
    cursor: ew-resize;
    pointer-events: auto;
  }

  &::-moz-range-thumb {
    width: 12px;
    height: 24px;
    background: var(--ui-color-primary-main);
    border: none;
    border-radius: 2px;
    cursor: ew-resize;
    pointer-events: auto;
  }
}

.playhead {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: var(--ui-color-grey-900);
  pointer-events: none;
  transform: translateX(-50%);
}

.trim-time-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--ui-color-grey-600);
}
</style>
