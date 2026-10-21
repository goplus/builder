<script lang="ts" setup>
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import type { LocaleMessage } from '@/utils/i18n'
import type { AnimationGen } from '@/models/spx/gen/animation-gen'
import { UIButton, UIError } from '@/components/ui'
import AnimationDetail from '@/components/editor/sprite/AnimationDetail.vue'
import { useRenameAnimationGen } from '../..'
import { humanizeTimeLeft } from '../common/time-left'
import GenLoading from '../common/GenLoading.vue'
import GenPreview from '../common/GenPreview.vue'
import PreviewWithCheckerboardBg from '../common/PreviewWithCheckerboardBg.vue'
import AnimationVideoPreview from './AnimationVideoPreview.vue'
import GenStateFailed from '../common/GenStateFailed.vue'

const props = defineProps<{
  gen: AnimationGen
  pendingMessage?: LocaleMessage
}>()

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
        <UIButton v-if="canSaveAnimation" type="green" :loading="savingAnimation" @click="handleSaveAnimation">{{
          $t({ en: 'Save animation', zh: '保存动画' })
        }}</UIButton>
      </slot>
    </template>
    <GenLoading v-if="gen.generateVideoState.status === 'running'">
      {{ $t(pendingMessage ?? { en: 'Generating animation...', zh: '正在生成动画...' }) }}
      {{ gen.generateVideoState.timeLeft != null ? $t(humanizeTimeLeft(gen.generateVideoState.timeLeft)) : '' }}
    </GenLoading>
    <GenStateFailed
      v-else-if="gen.generateVideoState.status === 'failed'"
      :state-failed="gen.generateVideoState"
      :back="gen.result != null || gen.hasPendingVideo ? () => gen.resetGenerateVideoState() : undefined"
    />
    <PreviewWithCheckerboardBg v-else>
      <AnimationVideoPreview
        v-if="gen.video != null"
        :key="videoPreviewKey"
        :video="gen.video"
        :frames-config="gen.framesConfig"
        @update:frames-config="gen.setFramesConfig($event)"
      />
      <GenLoading v-if="gen.finishState.status === 'running'" cover>
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
    :style="{ background: 'transparent' }"
    :animation="gen.result"
    :sound-editable="false"
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
