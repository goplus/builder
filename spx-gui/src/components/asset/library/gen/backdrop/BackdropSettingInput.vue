<script lang="ts" setup>
import { UIButton } from '@/components/ui'
import PromptInput from '../common/PromptInput.vue'
import ParamsSettings from '../common/param-settings/ParamsSettings.vue'
import { backdropParamSettings } from '../common/param-settings/data'
import type { BackdropGen } from '@/models/gen/backdrop-gen'

defineProps<{
  backdropGen: BackdropGen
}>()
</script>

<template>
  <PromptInput
    :value="backdropGen.input"
    :loading="backdropGen.enrichState.state === 'running'"
    @update:value="backdropGen.setInput($event)"
    @enrich="backdropGen.enrich()"
  >
    <template #param-settings>
      <ParamsSettings
        v-for="(paramSetting, key) in backdropParamSettings"
        :key="key"
        type="selector"
        :value="backdropGen.settings[key]"
        :options="paramSetting.options"
        :tips="paramSetting.tips"
        @update:value="backdropGen.setSettings({ [key]: $event })"
      />
    </template>
    <template #buttons>
      <UIButton :loading="backdropGen.generateState.state === 'running'" @click="backdropGen.generate()">{{
        $t({ zh: '生成', en: 'Generate' })
      }}</UIButton>
    </template>
  </PromptInput>
</template>

<style lang="scss" scoped></style>
