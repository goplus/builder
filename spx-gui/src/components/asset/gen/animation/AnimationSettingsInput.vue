<script lang="ts" setup>
import { UIButton } from '@/components/ui'
import type { AnimationGen } from '@/models/gen/animation-gen'
import SettingsInput from '../common/SettingsInput.vue'
import ArtStyleInput from '../common/ArtStyleInput.vue'
import PerspectiveInput from '../common/PerspectiveInput.vue'
import AnimationLoopModeInput from './AnimationLoopModeInput.vue'

defineProps<{
  gen: AnimationGen
}>()
</script>

<template>
  <SettingsInput
    :description="gen.settings.description"
    :enriching="gen.enrichState.status === 'running'"
    @update:description="gen.setSettings({ description: $event })"
    @enrich="gen.enrich()"
  >
    <template #extra>
      <ArtStyleInput :value="gen.settings.artStyle" @update:value="gen.setSettings({ artStyle: $event })" />
      <PerspectiveInput :value="gen.settings.perspective" @update:value="gen.setSettings({ perspective: $event })" />
      <AnimationLoopModeInput :value="gen.settings.loopMode" @update:value="gen.setSettings({ loopMode: $event })" />
    </template>
    <template #submit>
      <UIButton :loading="gen.generateVideoState.status === 'running'" @click="gen.generateVideo()">{{
        $t({ zh: '生成', en: 'Generate' })
      }}</UIButton>
    </template>
  </SettingsInput>
</template>

<style lang="scss" scoped></style>
