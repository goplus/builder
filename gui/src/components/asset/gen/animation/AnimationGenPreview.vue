<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import type { Animation } from '@/models/spx/animation'
import type { AnimationGen, FramesConfig } from '@/models/spx/gen/animation-gen'
import { UIButton, UIError } from '@/components/ui'
import AnimationDetail from '@/components/editor/sprite/AnimationDetail.vue'
import ResourceCanvas from '@/components/editor/sprite/ResourceCanvas.vue'
import ResourceGenerationPlaceholder from '@/components/editor/sprite/ResourceGenerationPlaceholder.vue'
import { useResourceCanvas } from '@/components/editor/sprite/resource-canvas'
import { useRenameAnimationGen } from '../..'
import { humanizeTimeLeft } from '../common/time-left'
import GenLoading from '../common/GenLoading.vue'
import GenPreview from '../common/GenPreview.vue'
import PreviewWithCheckerboardBg from '../common/PreviewWithCheckerboardBg.vue'
import AnimationVideoPreview from './AnimationVideoPreview.vue'
import GenStateFailed from '../common/GenStateFailed.vue'

const props = withDefaults(
  defineProps<{
    gen: AnimationGen
    savedAnimation?: Animation | null
    resourceActions?: boolean
    settingsEditable?: boolean
  }>(),
  { savedAnimation: null, resourceActions: true, settingsEditable: true }
)

function updateFramesConfig(config: FramesConfig) {
  if (
    'editHistory' in props.gen.parent &&
    props.gen.framesConfig != null &&
    (config.startTime !== props.gen.framesConfig.startTime ||
      config.duration !== props.gen.framesConfig.duration ||
      config.interval !== props.gen.framesConfig.interval)
  ) {
    props.gen.parent.editHistory.record(props.gen)
  }
  props.gen.setFramesConfig(config)
}

const canvas = useResourceCanvas()
const renameAnimation = useRenameAnimationGen()
const handleRenameAnimation = useMessageHandle(() => renameAnimation(props.gen), {
  en: 'Failed to rename animation',
  zh: '重命名动画失败'
}).fn

const canSaveAnimation = computed(() => {
  const { video, framesConfig, hasPendingVideo, generateVideoState } = props.gen
  if (generateVideoState.status === 'running' || generateVideoState.status === 'failed') return false
  return video != null && framesConfig != null && hasPendingVideo
})

const savingAnimation = computed(() => {
  const gen = props.gen
  return gen.finishState.status === 'running'
})

async function handleSaveAnimation() {
  const gen = props.gen
  await gen.finish()
}

function handleSaveErrorBack() {
  const gen = props.gen
  gen.resetFinishState()
}

// Use a computed key to force re-mount AnimationVideoPreview when video file changes
// TODO: improve AnimationVideoPreview to handle video file changes without re-mounting
const videoPreviewKey = computed(() => {
  const gen = props.gen
  return gen.name + ':' + (gen.video != null ? gen.video.name : '')
})
const referenceImage = computed(() => {
  const gen = props.gen
  return gen.referenceImageSelection?.type === 'local-image'
    ? gen.referenceImageSelection.file
    : (gen.referenceCostume ?? gen.sprite.defaultCostume)?.img ?? null
})
const videoReady = ref(false)
watch(
  () => props.gen.video,
  () => (videoReady.value = false)
)
const loadingMounted = ref(false)
watch(
  [() => props.gen, () => props.gen.generateVideoState.status],
  ([gen, status], [previousGen]) => {
    if (gen !== previousGen || status === 'failed') loadingMounted.value = false
    if (status === 'running') loadingMounted.value = true
  },
  { immediate: true }
)
const loading = computed(
  () =>
    props.gen.generateVideoState.status === 'running' ||
    (loadingMounted.value && props.gen.video != null && !videoReady.value)
)
</script>

<template>
  <GenPreview
    v-if="
      gen.result == null ||
      gen.hasPendingVideo ||
      gen.generateVideoState.status === 'running' ||
      gen.generateVideoState.status === 'failed'
    "
    class="absolute inset-0"
    :name="gen.name"
    @rename="handleRenameAnimation"
  >
    <template v-if="$slots.leading != null" #leading>
      <slot name="leading"></slot>
    </template>
    <template #ops>
      <slot name="ops">
        <UIButton
          v-if="resourceActions !== false && canSaveAnimation"
          type="green"
          :loading="savingAnimation"
          @click="handleSaveAnimation"
          >{{ $t({ en: 'Save animation', zh: '保存动画' }) }}</UIButton
        >
      </slot>
    </template>
    <ResourceGenerationPlaceholder
      v-if="gen.video == null && gen.generateVideoState.status === 'initial'"
      media-type="video"
      :resource-key="gen.result?.id ?? gen.id"
    />
    <GenStateFailed
      v-else-if="gen.generateVideoState.status === 'failed'"
      :state-failed="gen.generateVideoState"
      :back="gen.result != null || gen.hasPendingVideo ? () => gen.resetGenerateVideoState() : undefined"
    />
    <PreviewWithCheckerboardBg v-else-if="canvas == null || gen.video != null">
      <AnimationVideoPreview
        v-if="gen.video != null"
        :key="videoPreviewKey"
        :video="gen.video"
        :resource-key="gen.result?.id ?? gen.id"
        :reference-image="gen.result?.costumes[0]?.img"
        :frames-config="gen.framesConfig"
        :show-controls="!loadingMounted && !savingAnimation"
        @ready="videoReady = true"
        @update:frames-config="updateFramesConfig"
      >
        <GenLoading
          v-if="gen.finishState.status === 'running'"
          :style="canvas != null ? { height: 'calc(100% + 58px)' } : null"
          cover
        >
          {{ $t({ en: 'Saving animation...', zh: '正在保存动画...' }) }}
        </GenLoading>
        <UIError
          v-else-if="gen.finishState.status === 'failed'"
          cover
          :retry="handleSaveAnimation"
          :back="handleSaveErrorBack"
        >
          {{ $t(gen.finishState.error.userMessage) }}
        </UIError>
      </AnimationVideoPreview>
    </PreviewWithCheckerboardBg>
    <ResourceCanvas
      v-if="loadingMounted && gen.generateVideoState.status !== 'failed'"
      class="absolute! inset-0 z-10 bg-transparent! pointer-events-none"
      preview-only
      :resource-key="gen.result?.id ?? gen.id"
      :image="gen.result?.costumes[0]?.img ?? referenceImage"
    >
      <!-- Include the 54px trim controls and their 4px gap without resizing the video. -->
      <div class="absolute inset-x-0 top-0" :style="{ height: canvas != null ? 'calc(100% + 58px)' : '100%' }">
        <GenLoading
          :visible="loading"
          :playable="gen.generateVideoState.status === 'running'"
          :completed="gen.generateVideoState.status === 'finished'"
          cover
          @hidden="loadingMounted = false"
        >
          {{ $t({ en: 'Generating animation...', zh: '正在生成动画...' }) }}
          {{
            gen.generateVideoState.status === 'running' && gen.generateVideoState.timeLeft != null
              ? $t(humanizeTimeLeft(gen.generateVideoState.timeLeft))
              : ''
          }}
        </GenLoading>
      </div>
    </ResourceCanvas>
  </GenPreview>
  <AnimationDetail
    v-else
    :style="{ background: 'transparent' }"
    :animation="savedAnimation ?? gen.result"
    :settings-editable="settingsEditable"
    :sound-editable="canvas != null"
    @rename="handleRenameAnimation"
  >
    <template v-if="$slots.leading != null" #leading>
      <slot name="leading"></slot>
    </template>
    <template v-if="$slots.ops != null" #ops>
      <slot name="ops"></slot>
    </template>
  </AnimationDetail>
</template>
