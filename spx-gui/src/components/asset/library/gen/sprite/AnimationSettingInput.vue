<script lang="ts" setup>
import { UIButton } from '@/components/ui'
import { animationParamSettings } from '../common/param-settings/data'
import ParamsSettings from '../common/param-settings/ParamsSettings.vue'
import PromptInput from '../common/PromptInput.vue'
import type { AnimationGen } from '@/models/gen/animation-gen'

defineProps<{
  animationGen: AnimationGen
}>()
</script>

<template>
  <PromptInput
    :value="animationGen.input"
    :loading="animationGen.enrichState.state === 'running'"
    @update:value="animationGen.setInput($event)"
    @enrich="animationGen.enrich()"
  >
    <template #param-settings>
      <ParamsSettings
        v-for="(paramSetting, key) in animationParamSettings"
        :key="key"
        type="selector"
        :value="animationGen.settings[key]"
        :options="paramSetting.options"
        :tips="paramSetting.tips"
        @update:value="animationGen.setSettings({ [key]: $event })"
      />
    </template>
    <template #buttons>
      <UIButton :loading="animationGen.generateVideoState.state === 'running'" @click="animationGen.generateVideo()">{{
        $t({ zh: '生成', en: 'Generate' })
      }}</UIButton>
    </template>
  </PromptInput>
</template>

<style lang="scss" scoped></style>
