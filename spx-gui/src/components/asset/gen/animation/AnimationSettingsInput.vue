<script lang="ts" setup>
import { computed } from 'vue'
import { UIButton } from '@/components/ui'
import type { AnimationGen } from '@/models/gen/animation-gen'
import SettingsInput from '../common/SettingsInput.vue'
import ArtStyleInput from '../common/ArtStyleInput.vue'
import PerspectiveInput from '../common/PerspectiveInput.vue'
import AnimationLoopModeInput from './AnimationLoopModeInput.vue'

const props = defineProps<{
  gen: AnimationGen
}>()

const readonly = computed(() => props.gen.result != null)
const isGenerating = computed(() => props.gen.generateVideoState.status === 'running')
const isExtractingFrames = computed(() => props.gen.extractFramesState.status === 'running')
const disabled = computed(() => isGenerating.value || isExtractingFrames.value)
const buttonDisabled = computed(
  () => props.gen.enrichState.status === 'running' || isExtractingFrames.value || props.gen.settings.description === ''
)
</script>

<template>
  <SettingsInput
    :description="gen.settings.description"
    :enriching="gen.enrichState.status === 'running'"
    :readonly="readonly"
    :disabled="disabled"
    @update:description="gen.setSettings({ description: $event })"
    @enrich="gen.enrich()"
  >
    <template #extra>
      <ArtStyleInput :value="gen.settings.artStyle" @update:value="gen.setSettings({ artStyle: $event })" />
      <PerspectiveInput :value="gen.settings.perspective" @update:value="gen.setSettings({ perspective: $event })" />
      <AnimationLoopModeInput :value="gen.settings.loopMode" @update:value="gen.setSettings({ loopMode: $event })" />
    </template>
    <template #submit>
      <UIButton :disabled="buttonDisabled" :loading="isGenerating" @click="gen.generateVideo()">{{
        $t({ zh: '生成', en: 'Generate' })
      }}</UIButton>
    </template>
  </SettingsInput>
</template>

<style lang="scss" scoped></style>
