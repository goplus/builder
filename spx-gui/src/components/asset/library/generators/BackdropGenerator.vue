<template>
  <div class="backdrop-generator">
    <!-- Brief input (shown in input-brief and enriching stages) -->
    <form
      v-if="stage === 'input-brief' || stage === 'enriching'"
      class="settings-section settings-section--centered"
      @submit.prevent="handleSubmitBrief"
    >
      <div class="form-group">
        <UITextInput
          v-model:value="brief"
          :placeholder="$t({ en: 'Briefly describe the backdrop...', zh: '简要描述背景...' })"
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
          :placeholder="$t({ en: 'Describe the backdrop scene...', zh: '描述背景场景...' })"
          :disabled="stage === 'generating'"
          :rows="2"
        />
      </div>
      <div class="form-row">
        <div class="form-row-item">
          <div class="form-group">
            <label>{{ $t({ en: 'Name', zh: '名称' }) }}</label>
            <UITextInput v-model:value="backdropName" :disabled="stage === 'generating'" />
          </div>
        </div>
        <div class="form-row-item">
          <div class="form-group">
            <label>{{ $t({ en: 'Art Style', zh: '艺术风格' }) }}</label>
            <ArtStyleInput v-model:value="artStyle" :disabled="stage === 'generating'" />
          </div>
        </div>
        <div class="form-row-item">
          <div class="form-group">
            <label>{{ $t({ en: 'Perspective', zh: '游戏视角' }) }}</label>
            <PerspectiveInput v-model:value="perspective" :disabled="stage === 'generating'" />
          </div>
        </div>
        <div class="form-row-item">
          <div class="form-group">
            <label>{{ $t({ en: 'Category', zh: '类别' }) }}</label>
            <BackdropCategoryInput v-model:value="category" :disabled="stage === 'generating'" />
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

    <!-- Preview container (shown in all stages except enriching) -->
    <div v-if="stage !== 'input-brief' && stage !== 'enriching'" class="preview-container">
      <div v-if="stage === 'generating'" class="preview-loading">
        <UILoading />
        <p class="stage-message">
          {{ $t({ en: 'Generating backdrop image...', zh: '正在生成背景图片...' }) }}
        </p>
      </div>
      <img v-else-if="generatedImageUrl" :src="generatedImageUrl" alt="Generated backdrop" class="preview-image" />
      <div v-else class="preview-placeholder">
        <span class="preview-placeholder-text">{{ $t({ en: 'Preview', zh: '预览' }) }}</span>
      </div>

      <!-- Edit button (shown when image is generated) -->
      <button
        v-if="stage === 'preview' && generatedImageUrl && !showModificationForm"
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
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>

      <!-- Modification form (floating over preview) -->
      <div v-if="showModificationForm && stage === 'preview'" class="modification-form-overlay">
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

    <!-- Step 4: Preview and confirm -->
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
import { enrichSettings, generateBackdropImage, modifyBackdropImage, type BackdropSettings } from '@/apis/assets-gen'
import { AssetType } from '@/apis/asset'
import type { Project } from '@/models/project'
import { Backdrop } from '@/models/backdrop'
import type { AssetSettings, BackdropCategory } from '@/models/common/asset'
import { createFileWithWebUrl } from '@/models/common/cloud'
import ArtStyleInput from './ArtStyleInput.vue'
import PerspectiveInput from './PerspectiveInput.vue'
import BackdropCategoryInput from './BackdropCategoryInput.vue'

const props = defineProps<{
  project: Project
  settings?: AssetSettings
  /** Brief description */
  brief?: string
}>()

const emit = defineEmits<{
  generated: [backdrop: Backdrop]
}>()

type Stage = 'input-brief' | 'enriching' | 'editing' | 'generating' | 'preview'

const stage = ref<Stage>(props.brief ? 'enriching' : 'input-brief')
const brief = ref(props.brief ?? '')
const editableSettings = reactive<BackdropSettings>({
  artStyle: props.settings?.artStyle ?? null,
  perspective: props.settings?.perspective ?? null,
  projectDescription: props.settings?.projectDescription ?? null,
  description: props.settings?.description ?? null,
  category: props.settings?.category ?? null,
  name: undefined
})
const generatedImageUrl = ref<string>('')
const isCreating = ref(false)
const showModificationForm = ref(false)
const modificationInstruction = ref('')

const description = computed({
  get: () => editableSettings.description ?? '',
  set: (value: string) => {
    editableSettings.description = value
  }
})

const backdropName = computed({
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

const category = computed({
  get: () => editableSettings.category,
  set: (value: string) => {
    editableSettings.category = value as BackdropCategory
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
  const enriched = await enrichSettings(settingsToEnrich, AssetType.Backdrop)
  Object.assign(editableSettings, enriched)
  stage.value = 'editing'
}

async function handleGenerate() {
  stage.value = 'generating'
  try {
    generatedImageUrl.value = await generateBackdropImage(editableSettings)
    stage.value = 'preview'
    showModificationForm.value = false
    modificationInstruction.value = ''
  } catch (error) {
    console.error('Failed to generate backdrop image:', error)
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

  stage.value = 'generating'
  showModificationForm.value = false

  try {
    generatedImageUrl.value = await modifyBackdropImage(
      generatedImageUrl.value,
      modificationInstruction.value,
      editableSettings
    )
    stage.value = 'preview'
    modificationInstruction.value = ''
  } catch (error) {
    console.error('Failed to modify backdrop image:', error)
    stage.value = 'preview'
    showModificationForm.value = true
    throw error
  }
}

async function handleConfirm() {
  isCreating.value = true
  try {
    const file = createFileWithWebUrl(generatedImageUrl.value)
    const backdrop = await Backdrop.create(backdropName.value || 'backdrop', file)

    emit('generated', backdrop)
  } catch (error) {
    console.error('Failed to create backdrop:', error)
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
.backdrop-generator {
  display: flex;
  flex-direction: column;
  min-height: 436px;
  gap: var(--ui-gap-middle);
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
</style>
