<script lang="ts" setup>
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import type { AnimationGen } from '@/models/gen/animation-gen'
import { UIButton } from '@/components/ui'
import CheckerboardBackground from '@/components/editor/sprite/CheckerboardBackground.vue'
import { useRenameAnimationGen } from '../..'
import GenLoading from '../common/GenLoading.vue'
import GenPreview from '../common/GenPreview.vue'
import AnimationVideoPreview from './AnimationVideoPreview.vue'

const props = defineProps<{
  gen: AnimationGen
}>()

const renameAnimation = useRenameAnimationGen()
const handleRenameAnimation = useMessageHandle(renameAnimation, {
  en: 'Failed to rename animation',
  zh: '重命名动画失败'
}).fn

const savingAnimation = computed(() => {
  const gen = props.gen
  return gen.extractFramesState.status === 'running' || gen.finishState.status === 'running'
})

const handleSaveAnimation = useMessageHandle(
  async () => {
    const gen = props.gen
    await gen.extractFrames()
    await gen.finish()
  },
  {
    en: 'Failed to save animation',
    zh: '保存动画失败'
  }
).fn

// Use a computed key to force re-mount AnimationVideoPreview when video file changes
// TODO: improve AnimationVideoPreview to handle video file changes without re-mounting
const videoPreviewKey = computed(() => {
  const gen = props.gen
  return gen.name + ':' + (gen.video != null ? gen.video.name : '')
})
</script>

<template>
  <GenPreview class="animation-gen-preview" :name="gen.name" @rename="handleRenameAnimation(gen)">
    <template v-if="gen.video != null && gen.result == null" #ops>
      <UIButton color="success" :loading="savingAnimation" @click="handleSaveAnimation">{{
        $t({ en: 'Save animation', zh: '保存动画' })
      }}</UIButton>
    </template>
    <GenLoading v-if="gen.generateVideoState.status === 'running'">
      {{ $t({ en: 'Generating animation...', zh: '正在生成动画...' }) }}
    </GenLoading>
    <GenLoading v-else-if="gen.extractFramesState.status === 'running'">
      {{ $t({ en: 'Extracting frames...', zh: '正在提取帧...' }) }}
    </GenLoading>
    <div v-else class="preview">
      <!-- TODO: extract common styles between AnimationGenPreview and CostumeGenPreview -->
      <CheckerboardBackground class="background" />
      <AnimationVideoPreview
        v-if="gen.video != null"
        :key="videoPreviewKey"
        :video="gen.video"
        :frames-config="gen.framesConfig"
        @update:frames-config="gen.setFramesConfig($event)"
      />
      <div v-else class="placeholder">{{ $t({ en: 'Preview area', zh: '预览区域' }) }}</div>
    </div>
  </GenPreview>
</template>

<style lang="scss" scoped>
.animation-gen-preview {
  position: absolute;
  inset: 0;
}

.preview {
  width: 100%;
  flex: 1 1 0;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.background {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
}

.placeholder {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-color-hint-2);
}
</style>
