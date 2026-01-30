<script lang="ts" setup>
import { computed, watch } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { useEstimateRemainingTime } from '@/utils/remaining-time'
import type { AnimationGen } from '@/models/gen/animation-gen'
import { UIButton, UIError } from '@/components/ui'
import AnimationDetail from '@/components/editor/sprite/AnimationDetail.vue'
import { useRenameAnimationGen } from '../..'
import GenLoading from '../common/GenLoading.vue'
import GenPreview from '../common/GenPreview.vue'
import PreviewWithCheckerboardBg from '../common/PreviewWithCheckerboardBg.vue'
import AnimationVideoPreview from './AnimationVideoPreview.vue'

const props = defineProps<{
  gen: AnimationGen
}>()

const renameAnimation = useRenameAnimationGen()
const handleRenameAnimation = useMessageHandle(() => renameAnimation(props.gen), {
  en: 'Failed to rename animation',
  zh: '重命名动画失败'
}).fn

const canSaveAnimation = computed(() => {
  const { video, framesConfig, result } = props.gen
  return video != null && framesConfig != null && result == null
})

const savingAnimation = computed(() => {
  const gen = props.gen
  return gen.extractFramesState.status === 'running' || gen.finishState.status === 'running'
})

async function handleSaveAnimation() {
  const gen = props.gen
  await gen.extractFrames()
  await gen.finish()
}

function handleSaveErrorBack() {
  const gen = props.gen
  gen.resetFinishState()
  gen.resetExtractFramesState()
}

// Use a computed key to force re-mount AnimationVideoPreview when video file changes
// TODO: improve AnimationVideoPreview to handle video file changes without re-mounting
const videoPreviewKey = computed(() => {
  const gen = props.gen
  return gen.name + ':' + (gen.video != null ? gen.video.name : '')
})

const { remaining, start: startTimer, stop: stopTimer } = useEstimateRemainingTime()
// Estimated time in seconds to generate an animation video
const genVideoTimeConsuming = 150
// Minimum remaining time to show in seconds
const minRemaining = 3
// Update interval of remaining in seconds
const updateInterval = 3

watch(
  () => props.gen.generateVideoState,
  (state) => {
    if (state.status === 'running') {
      const elapsed = (Date.now() - state.startAt) / 1000
      const estimatedTotal = Math.round(Math.max(minRemaining, genVideoTimeConsuming - elapsed))
      startTimer({ estimatedTotal, updateInterval, minRemaining })
    } else {
      stopTimer()
    }
  },
  { immediate: true }
)
</script>

<template>
  <GenPreview v-if="gen.result == null" class="animation-gen-preview" :name="gen.name" @rename="handleRenameAnimation">
    <template v-if="canSaveAnimation" #ops>
      <UIButton color="success" :loading="savingAnimation" @click="handleSaveAnimation">{{
        $t({ en: 'Save animation', zh: '保存动画' })
      }}</UIButton>
    </template>
    <GenLoading v-if="gen.generateVideoState.status === 'running'" variant="bg-spin">
      {{
        remaining != null
          ? $t({
              en: `Generating animation... (about ${remaining} seconds remaining)`,
              zh: `正在生成动画...（大约还剩 ${remaining} 秒）`
            })
          : $t({ en: 'Generating animation...', zh: '正在生成动画...' })
      }}
    </GenLoading>
    <UIError v-else-if="gen.generateVideoState.status === 'failed'">
      {{ $t(gen.generateVideoState.error.userMessage) }}
    </UIError>
    <PreviewWithCheckerboardBg v-else>
      <AnimationVideoPreview
        v-if="gen.video != null"
        :key="videoPreviewKey"
        :video="gen.video"
        :frames-config="gen.framesConfig"
        @update:frames-config="gen.setFramesConfig($event)"
      />
      <GenLoading v-if="gen.extractFramesState.status === 'running'" variant="bg-spin" cover>
        {{ $t({ en: 'Extracting frames...', zh: '正在提取帧...' }) }}
      </GenLoading>
      <UIError
        v-else-if="gen.extractFramesState.status === 'failed'"
        cover
        :retry="handleSaveAnimation"
        :back="handleSaveErrorBack"
      >
        {{ $t(gen.extractFramesState.error.userMessage) }}
      </UIError>
      <GenLoading v-else-if="gen.finishState.status === 'running'" variant="bg-spin" cover>
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
    </PreviewWithCheckerboardBg>
  </GenPreview>
  <AnimationDetail
    v-else
    class="animation-detail"
    :animation="gen.result"
    :sound-editable="false"
    @rename="handleRenameAnimation"
  />
</template>

<style lang="scss" scoped>
.animation-gen-preview {
  position: absolute;
  inset: 0;
}
.animation-detail {
  background: transparent;
}
</style>
