<template>
  <div class="sprite-generator">
    <!-- Step 1: Enriching settings -->
    <div v-if="stage === 'enriching'" class="stage-container">
      <UILoading />
      <p class="stage-message">
        {{ $t({ en: 'Enriching settings...', zh: '正在丰富设置...' }) }}
      </p>
    </div>

    <!-- Step 2: Edit sprite settings -->
    <div v-else-if="stage === 'editing'" class="stage-container">
      <h3 class="stage-title">{{ $t({ en: 'Sprite Settings', zh: '精灵设置' }) }}</h3>
      <div class="settings-form">
        <div class="form-group">
          <label>{{ $t({ en: 'Sprite Name', zh: '精灵名称' }) }}</label>
          <UITextInput v-model:value="spriteName" :placeholder="$t({ en: 'e.g., Balrog, Knight, Dragon', zh: '例如：Balrog、Knight、Dragon' })" />
        </div>
        <div class="form-group">
          <label>{{ $t({ en: 'Description', zh: '描述' }) }}</label>
          <UITextInput
            v-model:value="description"
            type="textarea"
            :placeholder="$t({ en: 'Describe the sprite appearance and behaviors...', zh: '描述精灵的外观和行为...' })"
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
        <UIButton type="primary" size="large" @click="handleGenerateCostume">
          {{ $t({ en: 'Next: Generate Costume', zh: '下一步：生成造型' }) }}
        </UIButton>
      </div>
    </div>

    <!-- Step 3: Generate default costume -->
    <div v-else-if="stage === 'generating-costume'" class="stage-container">
      <h3 class="stage-title">{{ $t({ en: 'Generating Default Costume', zh: '正在生成默认造型' }) }}</h3>
      <CostumeGenerator
        v-if="tempSprite"
        :sprite="tempSprite"
        :settings="costumeSettings"
        @generated="handleCostumeGenerated"
      />
    </div>

    <!-- Step 4: Generating animation descriptions -->
    <div v-else-if="stage === 'generating-descriptions'" class="stage-container">
      <UILoading />
      <p class="stage-message">
        {{ $t({ en: 'Generating animation descriptions...', zh: '正在生成动画描述...' }) }}
      </p>
    </div>

    <!-- Step 5: Edit animation descriptions -->
    <div v-else-if="stage === 'editing-descriptions'" class="stage-container">
      <h3 class="stage-title">{{ $t({ en: 'Animation Descriptions', zh: '动画描述' }) }}</h3>
      <div class="descriptions-form">
        <div v-for="(desc, index) in animationDescriptions" :key="index" class="description-item">
          <div class="form-row">
            <div class="form-group flex-1">
              <label>{{ $t({ en: 'Animation Name', zh: '动画名称' }) }} {{ index + 1 }}</label>
              <UITextInput v-model:value="desc.name" />
            </div>
            <UIButton type="boring" class="remove-btn" @click="removeDescription(index)">
              {{ $t({ en: 'Remove', zh: '删除' }) }}
            </UIButton>
          </div>
          <div class="form-group">
            <label>{{ $t({ en: 'Description', zh: '描述' }) }}</label>
            <UITextInput
              v-model:value="desc.description"
              type="textarea"
              :placeholder="$t({ en: 'Describe the animation...', zh: '描述动画...' })"
            />
          </div>
        </div>
        <UIButton type="boring" @click="addDescription">
          {{ $t({ en: '+ Add Animation', zh: '+ 添加动画' }) }}
        </UIButton>
      </div>
      <div class="stage-actions">
        <UIButton type="primary" size="large" @click="handleGenerateAnimations">
          {{ $t({ en: 'Next: Generate Animations', zh: '下一步：生成动画' }) }}
        </UIButton>
      </div>
    </div>

    <!-- Step 6: Generate animations -->
    <div v-else-if="stage === 'generating-animations'" class="stage-container">
      <h3 class="stage-title">
        {{ $t({ en: 'Generating Animations', zh: '正在生成动画' }) }}
        ({{ generatedAnimations.length }}/{{ animationDescriptions.length }})
      </h3>
      <AnimationGenerator
        v-if="currentAnimationDescription && tempSprite"
        :sprite="tempSprite"
        :settings="currentAnimationSettings"
        @generated="handleAnimationGenerated"
      />
    </div>

    <!-- Step 7: Creating sprite -->
    <div v-else-if="stage === 'creating'" class="stage-container">
      <UILoading />
      <p class="stage-message">
        {{ $t({ en: 'Creating sprite...', zh: '正在创建精灵...' }) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { AssetType } from '@/apis/asset'
import type { Project } from '@/models/project'
import { Sprite } from '@/models/sprite'
import type { Costume } from '@/models/costume'
import type { Animation } from '@/models/animation'
import type { AssetSettings } from '@/models/common/asset'
import { getSpriteName } from '@/models/common/asset-name'
import {
  enrichSettings,
  generateAnimationDescriptions,
  type SpriteSettings,
  type CostumeSettings,
  type AnimationSettings,
  type AnimationDescription
} from '@/apis/assets-gen'
import UIButton from '@/components/ui/UIButton.vue'
import UITextInput from '@/components/ui/UITextInput.vue'
import { UILoading } from '@/components/ui'
import CostumeGenerator from './CostumeGenerator.vue'
import AnimationGenerator from './AnimationGenerator.vue'
import ArtStyleInput from './ArtStyleInput.vue'
import PerspectiveInput from './PerspectiveInput.vue'

const props = defineProps<{
  project: Project
  settings?: AssetSettings
}>()

const emit = defineEmits<{
  generated: [sprite: Sprite]
}>()

type Stage =
  | 'enriching'
  | 'editing'
  | 'generating-costume'
  | 'generating-descriptions'
  | 'editing-descriptions'
  | 'generating-animations'
  | 'creating'

const stage = ref<Stage>('enriching')
const enrichedSettings = shallowRef<SpriteSettings | null>(null)
const tempSprite = shallowRef<Sprite | null>(null)
const generatedCostume = shallowRef<Costume | null>(null)
const animationDescriptions = ref<AnimationDescription[]>([])
const generatedAnimations = ref<Animation[]>([])
const currentAnimationIndex = ref(0)

const spriteName = computed({
  get: () => enrichedSettings.value?.name ?? '',
  set: (v) => {
    if (enrichedSettings.value) enrichedSettings.value.name = v
  }
})

const description = computed({
  get: () => enrichedSettings.value?.description ?? '',
  set: (v) => {
    if (enrichedSettings.value) enrichedSettings.value.description = v
  }
})

const artStyle = computed({
  get: () => enrichedSettings.value?.artStyle ?? null,
  set: (v) => {
    if (enrichedSettings.value) enrichedSettings.value.artStyle = v
  }
})

const perspective = computed({
  get: () => enrichedSettings.value?.perspective ?? null,
  set: (v) => {
    if (enrichedSettings.value) enrichedSettings.value.perspective = v
  }
})

const costumeSettings = computed<CostumeSettings | undefined>(() => {
  if (!enrichedSettings.value) return undefined
  return {
    ...enrichedSettings.value,
    spriteName: enrichedSettings.value.name,
    name: undefined
  }
})

const currentAnimationDescription = computed(() => {
  return animationDescriptions.value[currentAnimationIndex.value] ?? null
})

const currentAnimationSettings = computed<AnimationSettings | undefined>(() => {
  if (!enrichedSettings.value || !currentAnimationDescription.value) return undefined
  return {
    ...enrichedSettings.value,
    spriteName: enrichedSettings.value.name,
    name: currentAnimationDescription.value.name,
    description: currentAnimationDescription.value.description
  }
})

onMounted(async () => {
  try {
    const enriched = await enrichSettings(props.settings ?? {}, AssetType.Sprite)
    enrichedSettings.value = enriched as SpriteSettings
    
    tempSprite.value = Sprite.create('TempSprite')
    
    stage.value = 'editing'
  } catch (error) {
    console.error('Failed to enrich settings:', error)
  }
})

function handleGenerateCostume() {
  stage.value = 'generating-costume'
}

function handleCostumeGenerated(costume: Costume) {
  generatedCostume.value = costume
  stage.value = 'generating-descriptions'
  generateDescriptions()
}

async function generateDescriptions() {
  try {
    const descriptions = await generateAnimationDescriptions(enrichedSettings.value!)
    animationDescriptions.value = descriptions
    stage.value = 'editing-descriptions'
  } catch (error) {
    console.error('Failed to generate animation descriptions:', error)
  }
}

function addDescription() {
  animationDescriptions.value.push({
    name: '',
    description: ''
  })
}

function removeDescription(index: number) {
  animationDescriptions.value.splice(index, 1)
}

function handleGenerateAnimations() {
  if (animationDescriptions.value.length === 0) {
    createSprite()
    return
  }
  currentAnimationIndex.value = 0
  generatedAnimations.value = []
  stage.value = 'generating-animations'
}

function handleAnimationGenerated(animation: Animation) {
  generatedAnimations.value.push(animation)
  currentAnimationIndex.value++
  
  if (currentAnimationIndex.value >= animationDescriptions.value.length) {
    createSprite()
  }
}

function createSprite() {
  stage.value = 'creating'
  
  try {
    if (!tempSprite.value) {
      throw new Error('Temporary sprite not initialized')
    }
    
    const finalName = getSpriteName(props.project, enrichedSettings.value?.name || 'Sprite')
    tempSprite.value.setName(finalName)
    
    emit('generated', tempSprite.value)
  } catch (error) {
    console.error('Failed to create sprite:', error)
  }
}
</script>

<style lang="scss" scoped>
.sprite-generator {
  display: flex;
  flex-direction: column;
  padding: var(--ui-gap-large);
  min-height: 436px;
  background: var(--ui-color-grey-100);
  border-radius: var(--ui-border-radius-2);
}

.stage-container {
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-large);
}

.stage-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--ui-color-title);
}

.stage-message {
  margin: var(--ui-gap-middle) 0 0 0;
  text-align: center;
  color: var(--ui-color-grey-700);
  font-size: 14px;
}

.settings-form,
.descriptions-form {
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-middle);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-small);

  label {
    font-size: 14px;
    font-weight: 500;
    color: var(--ui-color-title);
  }

  &.flex-1 {
    flex: 1;
  }
}

.form-row {
  display: flex;
  gap: var(--ui-gap-middle);
  align-items: flex-start;

  .form-row-item {
    flex: 1;
  }
}

.description-item {
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-small);
  padding: var(--ui-gap-middle);
  background: var(--ui-color-grey-200);
  border-radius: var(--ui-border-radius-1);

  .remove-btn {
    margin-top: 20px;
  }
}

.stage-actions {
  display: flex;
  gap: var(--ui-gap-middle);
  justify-content: flex-end;
  margin-top: var(--ui-gap-middle);
}
</style>
