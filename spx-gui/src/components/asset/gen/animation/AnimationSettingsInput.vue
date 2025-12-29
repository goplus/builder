<script lang="ts" setup>
import { computed } from 'vue'
import { UIButton } from '@/components/ui'
import type { AnimationGen } from '@/models/gen/animation-gen'
import SettingsInput from '../common/SettingsInput.vue'
import ArtStyleInput from '../common/ArtStyleInput.vue'
import PerspectiveInput from '../common/PerspectiveInput.vue'
import AnimationLoopModeInput from './AnimationLoopModeInput.vue'
import ParamReference from '../common/param-settings/ParamReference.vue'

const props = defineProps<{
  gen: AnimationGen
  onlyIcon?: boolean
}>()

// TODO: implement readonly mode
const readonly = computed(() => props.gen.result != null)
</script>

<template>
  <SettingsInput
    :description="gen.settings.description"
    :enriching="gen.enrichState.status === 'running'"
    @update:description="gen.setSettings({ description: $event })"
    @enrich="gen.enrich()"
  >
    <template #extra>
      <ParamReference
        v-if="gen.settings.referenceFrameUrl != null"
        :value="gen.settings.referenceFrameUrl"
        :tips="{ zh: '参考帧', en: 'Reference Frame' }"
      />
      <ArtStyleInput
        :value="gen.settings.artStyle"
        :only-icon="onlyIcon"
        @update:value="gen.setSettings({ artStyle: $event })"
      />
      <PerspectiveInput
        :value="gen.settings.perspective"
        :only-icon="onlyIcon"
        @update:value="gen.setSettings({ perspective: $event })"
      />
      <AnimationLoopModeInput
        :value="gen.settings.loopMode"
        :only-icon="onlyIcon"
        @update:value="gen.setSettings({ loopMode: $event })"
      />
    </template>
    <template v-if="!readonly" #submit>
      <UIButton :loading="gen.generateVideoState.status === 'running'" @click="gen.generateVideo()">{{
        $t({ zh: '生成', en: 'Generate' })
      }}</UIButton>
    </template>
  </SettingsInput>
</template>

<style lang="scss" scoped></style>
