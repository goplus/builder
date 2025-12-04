<template>
  <div class="sprite-generator">
    <!-- Costume Generator View (when editing a specific costume) -->
    <template v-if="editingCostumeIndex != null">
      <div class="step-header">
        <span class="step-number">{{ $t({ en: 'Step 3', zh: '第 3 步' }) }}</span>
        <span class="step-title">{{
          $t({ en: 'Generate Costume', zh: '生成造型' }) + ': ' + (editingCostumeName ?? '')
        }}</span>
      </div>
      <CostumeGenerator
        :sprite="sprite"
        :settings="costumeGeneratorSettings"
        :brief="editingCostumeBrief"
        :initial-costume-name="editingCostumeName"
        show-back
        @generated="handleCostumeGenerated"
        @back="handleCostumeGeneratorBack"
      />
    </template>

    <!-- Animation Generator View (when editing a specific animation) -->
    <template v-else-if="editingAnimationIndex != null">
      <div class="step-header">
        <span class="step-number">{{ $t({ en: 'Step 3', zh: '第 3 步' }) }}</span>
        <span class="step-title">{{
          $t({ en: 'Generate Animation', zh: '生成动画' }) + ': ' + (editingAnimationName ?? '')
        }}</span>
      </div>
      <AnimationGenerator
        :sprite="sprite"
        :settings="animationGeneratorSettings"
        :brief="editingAnimationBrief"
        :initial-animation-name="editingAnimationName"
        :saved-state="editingAnimationSavedState"
        show-back
        @generated="handleAnimationGenerated"
        @back="handleAnimationGeneratorBack"
        @hide="handleAnimationGeneratorHide"
      />
    </template>

    <!-- Main Sprite Generator View -->
    <template v-else>
      <!-- Step header -->
      <div class="step-header">
        <template v-if="stage === 'input-brief' || stage === 'enriching'">
          <span class="step-number">{{ $t({ en: 'Step 1', zh: '第 1 步' }) }}</span>
          <span class="step-title">{{ $t({ en: 'Describe the Sprite', zh: '描述精灵' }) }}</span>
        </template>
        <template v-else-if="stage === 'editing' || stage === 'generating'">
          <span class="step-number">{{ $t({ en: 'Step 2', zh: '第 2 步' }) }}</span>
          <span class="step-title">{{ $t({ en: 'Edit Sprite Details', zh: '编辑精灵细节' }) }}</span>
        </template>
        <template v-else-if="stage === 'preview'">
          <span class="step-number">{{ $t({ en: 'Step 3', zh: '第 3 步' }) }}</span>
          <span class="step-title">{{ $t({ en: 'Generate Costumes & Animations', zh: '生成造型和动画' }) }}</span>
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
            :placeholder="$t({ en: 'Briefly describe the sprite...', zh: '简要描述精灵...' })"
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

      <!-- Detailed settings form (shown in editing and later stages) -->
      <div v-else class="settings-section" :class="{ 'settings-section--compact': isGenerating }">
        <div class="form-group">
          <UITextInput
            v-model:value="description"
            type="textarea"
            :placeholder="$t({ en: 'Describe the sprite appearance and behaviors...', zh: '描述精灵的外观和行为...' })"
            :disabled="isGenerating"
            :rows="2"
          />
        </div>
        <div class="form-row">
          <div class="form-row-item">
            <div class="form-group">
              <label>{{ $t({ en: 'Name', zh: '名称' }) }}</label>
              <UITextInput v-model:value="spriteName" :disabled="isGenerating" style="width: 120px" />
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
          <div class="form-row-item">
            <div class="form-group">
              <label>{{ $t({ en: 'Category', zh: '类别' }) }}</label>
              <SpriteCategoryInput v-model:value="category" :disabled="isGenerating" />
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
            {{ $t({ en: 'Generating sprite content descriptions...', zh: '正在生成精灵内容描述...' }) }}
          </p>
        </div>
        <div v-else-if="stage === 'editing'" class="preview-placeholder">
          <span class="preview-placeholder-text">{{ $t({ en: 'Preview', zh: '预览' }) }}</span>
        </div>
        <div v-else class="preview-content">
          <!-- Costumes section -->
          <div class="content-section">
            <h4 class="section-title">{{ $t({ en: 'Costumes', zh: '造型' }) }}</h4>
            <div class="content-list">
              <div
                v-for="(item, index) in costumeItems"
                :key="`costume-${index}`"
                class="content-item"
                :class="{ 'content-item--pending': !item.generated }"
                @click="handleCostumeClick(index)"
              >
                <button
                  v-if="index !== 0"
                  class="content-item-delete"
                  :title="$t({ en: 'Delete', zh: '删除' })"
                  @click.stop="handleDeleteCostume(index)"
                >
                  ×
                </button>
                <div class="content-item-preview">
                  <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" class="content-item-image" />
                  <div v-else class="content-item-placeholder">
                    <span class="content-item-placeholder-icon">🎨</span>
                  </div>
                </div>
                <div class="content-item-info">
                  <span class="content-item-name">{{ item.name }}</span>
                  <span v-if="!item.generated" class="content-item-status">{{
                    $t({ en: 'Click to generate', zh: '点击生成' })
                  }}</span>
                </div>
              </div>
              <div class="content-item content-item--add" @click="handleAddCostume">
                <div class="content-item-preview">
                  <div class="content-item-placeholder">
                    <span class="content-item-add-icon">+</span>
                  </div>
                </div>
                <div class="content-item-info">
                  <span class="content-item-name">{{ $t({ en: 'Add', zh: '添加' }) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Animations section -->
          <div class="content-section">
            <h4 class="section-title">{{ $t({ en: 'Animations', zh: '动画' }) }}</h4>
            <div class="content-list">
              <div
                v-for="(item, index) in animationItems"
                :key="`animation-${index}`"
                class="content-item"
                :class="{
                  'content-item--pending': !item.generated && !item.savedState,
                  'content-item--generating': !item.generated && item.savedState != null,
                  'content-item--disabled': !canGenerateAnimation && !item.savedState
                }"
                :title="
                  !canGenerateAnimation && !item.savedState
                    ? $t({ en: 'Generate default costume first', zh: '请先生成默认造型' })
                    : ''
                "
                @click="handleAnimationClick(index)"
              >
                <button
                  class="content-item-delete"
                  :title="$t({ en: 'Delete', zh: '删除' })"
                  @click.stop="handleDeleteAnimation(index)"
                >
                  ×
                </button>
                <div class="content-item-preview">
                  <div v-if="item.thumbnailUrl" class="content-item-thumbnail">
                    <img :src="item.thumbnailUrl" :alt="item.name" class="content-item-image" />
                    <span class="content-item-play-icon">▶</span>
                  </div>
                  <div
                    v-else-if="item.savedState"
                    class="content-item-placeholder content-item-placeholder--generating"
                  >
                    <UILoading :size="24" />
                  </div>
                  <div v-else class="content-item-placeholder">
                    <span class="content-item-placeholder-icon">🎬</span>
                  </div>
                </div>
                <div class="content-item-info">
                  <span class="content-item-name">{{ item.name }}</span>
                  <span v-if="item.savedState" class="content-item-status content-item-status--generating">{{
                    $t({ en: 'Generating...', zh: '生成中...' })
                  }}</span>
                  <span v-else-if="!item.generated" class="content-item-status">{{
                    $t({ en: 'Click to generate', zh: '点击生成' })
                  }}</span>
                </div>
              </div>
              <div
                class="content-item content-item--add"
                :class="{ 'content-item--disabled': !canGenerateAnimation }"
                :title="
                  !canGenerateAnimation ? $t({ en: 'Generate default costume first', zh: '请先生成默认造型' }) : ''
                "
                @click="handleAddAnimation"
              >
                <div class="content-item-preview">
                  <div class="content-item-placeholder">
                    <span class="content-item-add-icon">+</span>
                  </div>
                </div>
                <div class="content-item-info">
                  <span class="content-item-name">{{ $t({ en: 'Add', zh: '添加' }) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div v-if="stage === 'preview'" class="stage-actions">
        <UIButton v-if="hasGeneratingAnimation" type="primary" size="large" @click="handleHide">
          {{ $t({ en: 'Hide', zh: '收起' }) }}
        </UIButton>
        <UIButton
          v-else
          type="primary"
          size="large"
          :loading="isCreating"
          :disabled="!canConfirm"
          @click="handleConfirm"
        >
          {{ $t({ en: 'Adopt', zh: '采用' }) }}
        </UIButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { UIButton, UITextInput, UILoading } from '@/components/ui'
import { AssetType } from '@/apis/asset'
import {
  enrichSettings,
  generateSpriteContentDescriptions,
  type SpriteSettings,
  type CostumeDescription,
  type AnimationDescription
} from '@/apis/assets-gen'
import type { Project } from '@/models/project'
import { Sprite } from '@/models/sprite'
import { Costume } from '@/models/costume'
import { Animation } from '@/models/animation'
import type { AssetSettings, SpriteCategory } from '@/models/common/asset'
import { getSpriteName } from '@/models/common/asset-name'
import ArtStyleInput from './ArtStyleInput.vue'
import PerspectiveInput from './PerspectiveInput.vue'
import SpriteCategoryInput from './SpriteCategoryInput.vue'
import CostumeGenerator from './CostumeGenerator.vue'
import AnimationGenerator, { type AnimationGeneratorState } from './AnimationGenerator.vue'

type CostumeItem = CostumeDescription & {
  generated: boolean
  imageUrl: string | null
  costume: Costume | null
}

type AnimationItem = AnimationDescription & {
  generated: boolean
  thumbnailUrl: string | null
  animation: Animation | null
  savedState: AnimationGeneratorState | null
}

export type SpriteGeneratorState = {
  stage: Stage
  brief: string
  editableSettings: SpriteSettings
  costumeItems: CostumeItem[]
  animationItems: AnimationItem[]
  sprite: Sprite
}

const props = defineProps<{
  project: Project
  settings?: AssetSettings
  /** Brief description */
  brief?: string
  /** Saved state for restoration */
  savedState?: SpriteGeneratorState
}>()

const emit = defineEmits<{
  generated: [sprite: Sprite]
  hide: []
}>()

type Stage = 'input-brief' | 'enriching' | 'editing' | 'generating' | 'preview'

function getInitialStage(): Stage {
  if (props.savedState) return props.savedState.stage
  if (props.brief) return 'enriching'
  return 'input-brief'
}

const stage = ref<Stage>(getInitialStage())
const brief = ref(props.savedState?.brief ?? props.brief ?? '')
const editableSettings = reactive<SpriteSettings>(
  props.savedState?.editableSettings ?? {
    artStyle: props.settings?.artStyle ?? null,
    perspective: props.settings?.perspective ?? null,
    projectDescription: props.settings?.projectDescription ?? null,
    description: props.settings?.description ?? null,
    category: props.settings?.category ?? null,
    name: undefined
  }
)
const isCreating = ref(false)

const costumeItems = ref<CostumeItem[]>(props.savedState?.costumeItems ?? [])
const animationItems = ref<AnimationItem[]>(props.savedState?.animationItems ?? [])

// Single sprite instance used for costume generation, animation generation, and final submit
const sprite = props.savedState?.sprite ?? Sprite.create(editableSettings.name || 'Sprite')

// For costume generation within SpriteGenerator
const editingCostumeIndex = ref<number | null>(null)

// For animation generation within SpriteGenerator
const editingAnimationIndex = ref<number | null>(null)

const costumeGeneratorSettings = computed<AssetSettings>(() => ({
  artStyle: editableSettings.artStyle,
  perspective: editableSettings.perspective,
  projectDescription: editableSettings.projectDescription,
  description: editableSettings.description,
  category: editableSettings.category
}))

const animationGeneratorSettings = computed<AssetSettings>(() => ({
  artStyle: editableSettings.artStyle,
  perspective: editableSettings.perspective,
  projectDescription: editableSettings.projectDescription,
  description: editableSettings.description,
  category: editableSettings.category
}))

const editingAnimationBrief = computed(() => {
  if (editingAnimationIndex.value == null) return undefined
  const item = animationItems.value[editingAnimationIndex.value]
  return item?.description ?? undefined
})

const editingAnimationName = computed(() => {
  if (editingAnimationIndex.value == null) return undefined
  const item = animationItems.value[editingAnimationIndex.value]
  return item?.name ?? undefined
})

const editingAnimationSavedState = computed(() => {
  if (editingAnimationIndex.value == null) return undefined
  const item = animationItems.value[editingAnimationIndex.value]
  return item?.savedState ?? undefined
})

const editingCostumeBrief = computed(() => {
  if (editingCostumeIndex.value == null) return undefined
  const item = costumeItems.value[editingCostumeIndex.value]
  return item?.description ?? undefined
})

const editingCostumeName = computed(() => {
  if (editingCostumeIndex.value == null) return undefined
  const item = costumeItems.value[editingCostumeIndex.value]
  return item?.name ?? undefined
})

const isGenerating = computed(() => stage.value === 'generating')

// Animation generation requires the default costume (first costume) to be generated
const canGenerateAnimation = computed(() => {
  const defaultCostumeItem = costumeItems.value[0]
  return defaultCostumeItem?.generated === true && defaultCostumeItem.costume != null
})

const canConfirm = computed(() => {
  // At least one costume must be generated
  return costumeItems.value.some((item) => item.generated)
})

const hasGeneratingAnimation = computed(() => {
  return animationItems.value.some((item) => item.savedState != null)
})

const description = computed({
  get: () => editableSettings.description ?? '',
  set: (value: string) => {
    editableSettings.description = value
  }
})

const spriteName = computed({
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
    editableSettings.category = value as SpriteCategory
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
  const enriched = await enrichSettings(settingsToEnrich, AssetType.Sprite)
  Object.assign(editableSettings, enriched)
  stage.value = 'editing'
}

async function handleGenerate() {
  stage.value = 'generating'
  try {
    const descriptions = await generateSpriteContentDescriptions(editableSettings)

    // Convert descriptions to items with pending state
    costumeItems.value = descriptions.costumes.map((desc) => ({
      ...desc,
      generated: false,
      imageUrl: null,
      costume: null
    }))

    animationItems.value = descriptions.animations.map((desc) => ({
      ...desc,
      generated: false,
      thumbnailUrl: null,
      animation: null,
      savedState: null
    }))

    stage.value = 'preview'

    // Automatically start generating the default costume (first costume)
    if (costumeItems.value.length > 0) {
      editingCostumeIndex.value = 0
    }
  } catch (error) {
    console.error('Failed to generate sprite content descriptions:', error)
    stage.value = 'editing'
    throw error
  }
}

function handleCostumeClick(index: number) {
  const item = costumeItems.value[index]
  if (item.generated) {
    // Already generated - allow re-generation by opening the generator
    editingCostumeIndex.value = index
  } else {
    // Open costume generator for this item
    editingCostumeIndex.value = index
  }
}

function handleCostumeGenerated(costume: Costume) {
  if (editingCostumeIndex.value == null) return

  const index = editingCostumeIndex.value
  const item = costumeItems.value[index]

  // Update the costume item with generated data
  item.generated = true
  item.costume = costume

  // Add costume to sprite
  sprite.addCostume(costume)

  // Get image URL asynchronously
  costume.img
    .url(() => {
      // Store cleanup for later (when component unmounts or item is removed)
      // For now, we'll let it clean up when the file is garbage collected
    })
    .then((url) => {
      item.imageUrl = url
    })

  // Return to sprite preview
  editingCostumeIndex.value = null
}

function handleCostumeGeneratorBack() {
  editingCostumeIndex.value = null
}

function handleAnimationClick(index: number) {
  const item = animationItems.value[index]

  // If animation has saved state (generating in background), allow resuming
  if (item.savedState != null) {
    editingAnimationIndex.value = index
    return
  }

  // Only allow new animation generation if default costume is generated
  if (!canGenerateAnimation.value) {
    return
  }

  // Open animation generator for this item
  editingAnimationIndex.value = index
}

function handleAnimationGenerated(animation: Animation) {
  if (editingAnimationIndex.value == null) return

  const index = editingAnimationIndex.value
  const item = animationItems.value[index]

  // Update the animation item with generated data
  item.generated = true
  item.animation = animation
  item.savedState = null

  // Add animation to sprite
  sprite.addAnimation(animation)

  // Get thumbnail URL from the first frame of animation
  const firstFrame = animation.costumes[0]
  if (firstFrame) {
    firstFrame.img
      .url(() => {
        // Cleanup handler
      })
      .then((url) => {
        item.thumbnailUrl = url
      })
  }

  // Return to sprite preview
  editingAnimationIndex.value = null
}

function handleAnimationGeneratorHide(state: AnimationGeneratorState) {
  if (editingAnimationIndex.value == null) return

  const index = editingAnimationIndex.value
  const item = animationItems.value[index]

  // Save the state for later restoration
  item.savedState = state

  // Return to sprite preview
  editingAnimationIndex.value = null
}

function handleAnimationGeneratorBack() {
  editingAnimationIndex.value = null
}

function handleAddCostume() {
  // Add a new costume item and open the generator
  const newIndex = costumeItems.value.length
  costumeItems.value.push({
    name: `Costume${newIndex + 1}`,
    description: '',
    generated: false,
    imageUrl: null,
    costume: null
  })
  editingCostumeIndex.value = newIndex
}

function handleAddAnimation() {
  if (!canGenerateAnimation.value) return

  // Add a new animation item and open the generator
  const newIndex = animationItems.value.length
  animationItems.value.push({
    name: `Animation${newIndex + 1}`,
    description: '',
    generated: false,
    thumbnailUrl: null,
    animation: null,
    savedState: null
  })
  editingAnimationIndex.value = newIndex
}

function handleDeleteCostume(index: number) {
  if (index === 0) return // Cannot delete default costume

  const item = costumeItems.value[index]
  // Remove costume from sprite if it was generated
  if (item.costume) {
    sprite.removeCostume(item.costume.name)
  }
  costumeItems.value.splice(index, 1)
}

function handleDeleteAnimation(index: number) {
  const item = animationItems.value[index]
  // Remove animation from sprite if it was generated
  if (item.animation) {
    sprite.removeAnimation(item.animation.name)
  }
  animationItems.value.splice(index, 1)
}

function getState(): SpriteGeneratorState {
  return {
    stage: stage.value,
    brief: brief.value,
    editableSettings: { ...editableSettings },
    costumeItems: costumeItems.value as CostumeItem[],
    animationItems: animationItems.value as AnimationItem[],
    sprite
  }
}

function handleHide() {
  emit('hide')
}

defineExpose({
  getState,
  hasGeneratingAnimation
})

async function handleConfirm() {
  isCreating.value = true
  try {
    const finalName = getSpriteName(props.project, editableSettings.name || 'Sprite')

    // Rename the sprite to the final name
    sprite.setName(finalName)

    emit('generated', sprite)
  } catch (error) {
    console.error('Failed to create sprite:', error)
    throw error
  } finally {
    isCreating.value = false
  }
}

// Initialize if brief is provided and no saved state
if (props.brief && !props.savedState) {
  enrichSettingsWithBrief()
}
</script>

<style lang="scss" scoped>
.sprite-generator {
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
  min-height: 300px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--ui-gap-large);
  background: var(--ui-color-grey-100);
  border-radius: var(--ui-border-radius-2);
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

.preview-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-large);
}

.content-section {
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-middle);
}

.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ui-color-title);
}

.content-list {
  display: flex;
  gap: var(--ui-gap-middle);
  flex-wrap: wrap;
}

.content-item {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100px;
  cursor: pointer;
  border-radius: var(--ui-border-radius-1);
  overflow: hidden;
  background: var(--ui-color-white);
  border: 2px solid transparent;
  transition: all 0.2s;

  &:hover {
    border-color: var(--ui-color-primary-main);
  }

  &--pending {
    opacity: 0.7;

    .content-item-preview {
      background: var(--ui-color-grey-200);
    }
  }

  &--disabled {
    opacity: 0.4;
    cursor: not-allowed;

    &:hover {
      border-color: transparent;
    }
  }

  &--generating {
    border-color: var(--ui-color-primary-200);

    .content-item-preview {
      background: var(--ui-color-primary-100);
    }
  }
}

.content-item-preview {
  width: 100%;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ui-color-grey-100);
  position: relative;
}

.content-item-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.content-item-thumbnail {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-item-play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 20px;
  color: var(--ui-color-white);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.content-item-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;

  &--generating {
    background: var(--ui-color-primary-100);
  }
}

.content-item-placeholder-icon {
  font-size: 24px;
  opacity: 0.5;
}

.content-item-add-icon {
  font-size: 32px;
  color: var(--ui-color-grey-500);
}

.content-item--add {
  border: 2px dashed var(--ui-color-grey-300);
  background: transparent;

  &:hover:not(.content-item--disabled) {
    border-color: var(--ui-color-primary-main);

    .content-item-add-icon {
      color: var(--ui-color-primary-main);
    }
  }
}

.content-item-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--ui-color-grey-800);
  color: var(--ui-color-white);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 1;

  &:hover {
    background: var(--ui-color-danger-main);
  }
}

.content-item:hover .content-item-delete {
  opacity: 1;
}

.content-item-preview {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.content-item-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--ui-color-title);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content-item-status {
  font-size: 10px;
  color: var(--ui-color-grey-600);

  &--generating {
    color: var(--ui-color-primary-main);
  }
}

.stage-actions {
  display: flex;
  gap: var(--ui-gap-middle);
  justify-content: flex-end;
}
</style>
