<template>
  <div class="animation-generator">
    <!-- Step 1: Enriching settings -->
    <div v-if="stage === 'enriching'" class="stage-container">
      <UILoading />
      <p class="stage-message">
        {{ $t({ en: 'Enriching settings...', zh: '正在丰富设置...' }) }}
      </p>
    </div>

    <!-- Step 2: Edit settings -->
    <div v-else-if="stage === 'editing'" class="stage-container">
      <h3 class="stage-title">{{ $t({ en: 'Animation Settings', zh: '动画设置' }) }}</h3>
      <div class="settings-form">
        <div class="form-group">
          <label>{{ $t({ en: 'Animation Name', zh: '动画名称' }) }}</label>
          <UITextInput v-model:value="animationName" :placeholder="$t({ en: 'e.g., walk, idle, attack', zh: '例如：walk、idle、attack' })" />
        </div>
        <div class="form-group">
          <label>{{ $t({ en: 'Description', zh: '描述' }) }}</label>
          <UITextInput
            v-model:value="description"
            type="textarea"
            :placeholder="$t({ en: 'Describe the animation movement...', zh: '描述动画动作...' })"
          />
        </div>
        <div class="form-row">
          <div class="form-row-item">
            <div class="form-group">
              <label>{{ $t({ en: 'Art Style', zh: '艺术风格' }) }}</label>
              <ArtStyleInput v-model:value="artStyle" />
            </div>
          </div>
          <div class="form-row-item">
            <div class="form-group">
              <label>{{ $t({ en: 'Perspective', zh: '视角' }) }}</label>
              <PerspectiveInput v-model:value="perspective" />
            </div>
          </div>
        </div>
      </div>
      <div class="stage-actions">
        <UIButton type="primary" size="large" @click="handleGenerateFrames">
          {{ $t({ en: 'Generate Frames', zh: '生成帧' }) }}
        </UIButton>
      </div>
    </div>

    <!-- Step 3: Generating frames -->
    <div v-else-if="stage === 'generating-frames'" class="stage-container">
      <UILoading />
      <p class="stage-message">
        {{ $t({ en: 'Generating animation frames...', zh: '正在生成动画帧...' }) }}
      </p>
    </div>

    <!-- Step 4: Preview frames -->
    <div v-else-if="stage === 'preview-frames'" class="stage-container">
      <h3 class="stage-title">{{ $t({ en: 'Generated Frames', zh: '生成的帧' }) }}</h3>
      <div class="frames-container">
        <div class="frame-preview">
          <label>{{ $t({ en: 'Start Frame', zh: '起始帧' }) }}</label>
          <img :src="startFrameUrl" alt="Start frame" class="frame-image" />
        </div>
        <div class="frame-preview">
          <label>{{ $t({ en: 'End Frame', zh: '结束帧' }) }}</label>
          <img :src="endFrameUrl" alt="End frame" class="frame-image" />
        </div>
      </div>
      <div class="stage-actions">
        <UIButton type="boring" size="large" @click="handleRegenerateFrames">
          {{ $t({ en: 'Regenerate', zh: '重新生成' }) }}
        </UIButton>
        <UIButton type="primary" size="large" @click="handleGenerateVideo">
          {{ $t({ en: 'Generate Video', zh: '生成视频' }) }}
        </UIButton>
      </div>
    </div>

    <!-- Step 5: Generating video -->
    <div v-else-if="stage === 'generating-video'" class="stage-container">
      <UILoading />
      <p class="stage-message">
        {{ $t({ en: 'Generating animation video...', zh: '正在生成动画视频...' }) }}
      </p>
    </div>

    <!-- Step 6: Preview video and trim -->
    <div v-else-if="stage === 'preview-video'" class="stage-container">
      <h3 class="stage-title">{{ $t({ en: 'Generated Video', zh: '生成的视频' }) }}</h3>
      <div class="video-container">
        <video :src="videoUrl" controls loop class="preview-video" />
      </div>
      <div class="trim-controls">
        <label>{{ $t({ en: 'Duration (seconds)', zh: '时长（秒）' }) }}</label>
        <UITextInput v-model:value="durationStr" type="text" />
      </div>
      <div class="stage-actions">
        <UIButton type="boring" size="large" @click="handleRegenerateVideo">
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
import {
  enrichSettings,
  generateAnimationFrames,
  generateAnimationVideo,
  getFramesFromVideo,
  type AnimationSettings
} from '@/apis/assets-gen'
import type { Sprite } from '@/models/sprite'
import { Animation } from '@/models/animation'
import { Costume } from '@/models/costume'
import type { AssetSettings } from '@/models/common/asset'
import { fromBlob } from '@/models/common/file'
import { getAnimationName } from '@/models/common/asset-name'
import ArtStyleInput from './ArtStyleInput.vue'
import PerspectiveInput from './PerspectiveInput.vue'

const props = defineProps<{
  sprite: Sprite
  settings?: AssetSettings
}>()

const emit = defineEmits<{
  generated: [animation: Animation]
}>()

type Stage = 'enriching' | 'editing' | 'generating-frames' | 'preview-frames' | 'generating-video' | 'preview-video'

const stage = ref<Stage>('enriching')
const editableSettings = reactive<AnimationSettings>({
  artStyle: null,
  perspective: null,
  projectDescription: null,
  description: null,
  spriteName: props.sprite.name,
  name: undefined
})
const startFrameUrl = ref<string>('')
const endFrameUrl = ref<string>('')
const videoUrl = ref<string>('')
const duration = ref<number>(1)
const isCreating = ref(false)

const description = computed({
  get: () => editableSettings.description ?? '',
  set: (value: string) => {
    editableSettings.description = value
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

const animationName = computed({
  get: () => editableSettings.name ?? '',
  set: (value: string) => {
    editableSettings.name = value
  }
})

const durationStr = computed({
  get: () => duration.value.toString(),
  set: (value: string) => {
    const parsed = parseFloat(value)
    if (!isNaN(parsed) && parsed > 0) {
      duration.value = parsed
    }
  }
})

onMounted(async () => {
  // Step 1: Enrich settings
  const enriched = await enrichSettings(props.settings ?? {}, 'animation')
  Object.assign(editableSettings, enriched)
  stage.value = 'editing'
})

async function handleGenerateFrames() {
  stage.value = 'generating-frames'
  try {
    // Step 3: Generate start and end frames
    const frames = await generateAnimationFrames(editableSettings)
    startFrameUrl.value = frames.startFrameUrl
    endFrameUrl.value = frames.endFrameUrl
    stage.value = 'preview-frames'
  } catch (error) {
    console.error('Failed to generate animation frames:', error)
    stage.value = 'editing'
    throw error
  }
}

function handleRegenerateFrames() {
  stage.value = 'editing'
}

async function handleGenerateVideo() {
  stage.value = 'generating-video'
  try {
    // Step 5: Generate video from frames
    videoUrl.value = await generateAnimationVideo(editableSettings, startFrameUrl.value, endFrameUrl.value)
    stage.value = 'preview-video'
  } catch (error) {
    console.error('Failed to generate animation video:', error)
    stage.value = 'preview-frames'
    throw error
  }
}

function handleRegenerateVideo() {
  stage.value = 'preview-frames'
}

async function handleConfirm() {
  isCreating.value = true
  try {
    // Step 7: Extract frames from video and create animation
    const frameUrls = await getFramesFromVideo(videoUrl.value, 100)
    
    // Create costumes from frames
    const costumes: Costume[] = []
    for (let i = 0; i < frameUrls.length; i++) {
      const frameUrl = frameUrls[i]
      const response = await fetch(frameUrl)
      const blob = await response.blob()
      const file = fromBlob(`frame_${i.toString().padStart(4, '0')}.png`, blob)
      const costume = new Costume(`frame_${i}`, file)
      costumes.push(costume)
    }

    // Create animation
    const animationNameValue = editableSettings.name || 'animation'
    const animation = Animation.create(animationNameValue, costumes, {
      duration: duration.value
    })
    animation.setName(getAnimationName(props.sprite, animationNameValue))

    emit('generated', animation)
  } catch (error) {
    console.error('Failed to create animation:', error)
    throw error
  } finally {
    isCreating.value = false
  }
}
</script>

<style lang="scss" scoped>
.animation-generator {
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

  .form-row-item {
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

.frames-container {
  width: 100%;
  display: flex;
  gap: var(--ui-gap-large);
  justify-content: center;
}

.frame-preview {
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-small);
  align-items: center;

  label {
    font-size: 14px;
    font-weight: 500;
    color: var(--ui-color-title);
  }
}

.frame-image {
  max-width: 200px;
  max-height: 200px;
  object-fit: contain;
  background: var(--ui-color-grey-100);
  border-radius: var(--ui-border-radius-2);
  padding: var(--ui-gap-small);
}

.video-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--ui-gap-large);
  background: var(--ui-color-grey-100);
  border-radius: var(--ui-border-radius-2);
}

.preview-video {
  max-width: 100%;
  max-height: 300px;
}

.trim-controls {
  width: 100%;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 14px;
    font-weight: 500;
    color: var(--ui-color-title);
  }
}

.stage-actions {
  display: flex;
  gap: var(--ui-gap-middle);
  margin-top: var(--ui-gap-middle);
  align-self: flex-end;
}
</style>
