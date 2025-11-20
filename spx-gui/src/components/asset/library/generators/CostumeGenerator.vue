<template>
  <div class="costume-generator">
    <!-- Step 1: Enriching settings -->
    <div v-if="stage === 'enriching'" class="stage-container">
      <UILoading />
      <p class="stage-message">
        {{ $t({ en: 'Enriching settings...', zh: '正在丰富设置...' }) }}
      </p>
    </div>

    <!-- Step 2: Edit settings -->
    <div v-else-if="stage === 'editing'" class="stage-container">
      <h3 class="stage-title">{{ $t({ en: 'Costume Settings', zh: '造型设置' }) }}</h3>
      <div class="settings-form">
        <div class="form-group">
          <label>{{ $t({ en: 'Description', zh: '描述' }) }}</label>
          <UITextInput
            v-model:value="description"
            type="textarea"
            :placeholder="$t({ en: 'Describe the costume appearance...', zh: '描述造型外观...' })"
          />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>{{ $t({ en: 'Art Style', zh: '艺术风格' }) }}</label>
            <UITextInput v-model:value="artStyle" />
          </div>
          <div class="form-group">
            <label>{{ $t({ en: 'Perspective', zh: '视角' }) }}</label>
            <UITextInput v-model:value="perspective" />
          </div>
        </div>
      </div>
      <div class="stage-actions">
        <UIButton type="primary" size="large" @click="handleGenerate">
          {{ $t({ en: 'Generate', zh: '生成' }) }}
        </UIButton>
      </div>
    </div>

    <!-- Step 3: Generating image -->
    <div v-else-if="stage === 'generating'" class="stage-container">
      <UILoading />
      <p class="stage-message">
        {{ $t({ en: 'Generating costume image...', zh: '正在生成造型图片...' }) }}
      </p>
    </div>

    <!-- Step 4: Preview and confirm -->
    <div v-else-if="stage === 'preview'" class="stage-container">
      <h3 class="stage-title">{{ $t({ en: 'Generated Costume', zh: '生成的造型' }) }}</h3>
      <div class="preview-container">
        <img :src="generatedImageUrl" alt="Generated costume" class="preview-image" />
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
import { enrichSettings, generateCostumeImage, type CostumeSettings } from '@/apis/assets-gen'
import type { Sprite } from '@/models/sprite'
import { Costume } from '@/models/costume'
import type { AssetSettings } from '@/models/common/asset'
import { createFileWithWebUrl } from '@/models/common/cloud'

const props = defineProps<{
  sprite: Sprite
  settings?: AssetSettings
}>()

const emit = defineEmits<{
  generated: [costume: Costume]
}>()

type Stage = 'enriching' | 'editing' | 'generating' | 'preview'

const stage = ref<Stage>('enriching')
const editableSettings = reactive<CostumeSettings>({
  artStyle: null,
  perspective: null,
  projectDescription: null,
  description: null,
  spriteName: props.sprite.name
})
const generatedImageUrl = ref<string>('')
const isCreating = ref(false)

const description = computed({
  get: () => editableSettings.description ?? '',
  set: (value: string) => {
    editableSettings.description = value
  }
})

const artStyle = computed({
  get: () => editableSettings.artStyle ?? '',
  set: (value: string) => {
    editableSettings.artStyle = value
  }
})

const perspective = computed({
  get: () => editableSettings.perspective ?? '',
  set: (value: string) => {
    editableSettings.perspective = value
  }
})

onMounted(async () => {
  // Step 1: Enrich settings
  const enriched = await enrichSettings(props.settings ?? {}, 'costume')
  Object.assign(editableSettings, enriched)
  stage.value = 'editing'
})

async function handleGenerate() {
  stage.value = 'generating'
  try {
    // Step 3: Generate image
    generatedImageUrl.value = await generateCostumeImage(editableSettings)
    stage.value = 'preview'
  } catch (error) {
    console.error('Failed to generate costume image:', error)
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
    // Step 5: Create costume from generated image
    const file = createFileWithWebUrl(generatedImageUrl.value)
    const costume = await Costume.create('TODO', file)

    emit('generated', costume)
  } catch (error) {
    console.error('Failed to create costume:', error)
    throw error
  } finally {
    isCreating.value = false
  }
}
</script>

<style lang="scss" scoped>
.costume-generator {
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

.preview-container {
  width: 100%;
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

.stage-actions {
  display: flex;
  gap: var(--ui-gap-middle);
  margin-top: var(--ui-gap-middle);
  align-self: flex-end;
}
</style>
