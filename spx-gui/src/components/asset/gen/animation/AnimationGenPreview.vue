<script lang="ts" setup>
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import type { AnimationGen } from '@/models/gen/animation-gen'
import { UIButton, UIError } from '@/components/ui'
import AnimationDetail from '@/components/editor/sprite/AnimationDetail.vue'
import { useRenameAnimationGen } from '../..'
import { humanizeRemaining } from '../common/remaining-time'
import GenLoading from '../common/GenLoading.vue'
import GenPreview from '../common/GenPreview.vue'
import PreviewWithCheckerboardBg from '../common/PreviewWithCheckerboardBg.vue'
import AnimationVideoPreview from './AnimationVideoPreview.vue'
import GenStateFailed from '../common/GenStateFailed.vue'

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
</script>

<template>
  <GenPreview v-if="gen.result == null" class="animation-gen-preview" :name="gen.name" @rename="handleRenameAnimation">
    <template v-if="canSaveAnimation" #ops>
      <UIButton color="success" :loading="savingAnimation" @click="handleSaveAnimation">{{
        $t({ en: 'Save animation', zh: '保存动画' })
      }}</UIButton>
    </template>
    <GenLoading v-if="gen.generateVideoState.status === 'running'" variant="bg-spin">
      {{ $t({ en: 'Generating animation...', zh: '正在生成动画...' }) }}
      {{ gen.generateVideoState.remaining != null ? $t(humanizeRemaining(gen.generateVideoState.remaining)) : '' }}
    </GenLoading>
    <GenStateFailed v-else-if="gen.generateVideoState.status === 'failed'" :state-failed="gen.generateVideoState" />
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
