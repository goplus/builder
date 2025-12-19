<script lang="ts" setup>
import { costumeParamSettings } from '../common/param-settings/data'
import ParamsSettings from '../common/param-settings/ParamsSettings.vue'
import PromptInput from '../common/PromptInput.vue'
import type { CostumeGen } from '@/models/gen/costume-gen'

defineProps<{
  costumeGen: CostumeGen
}>()
</script>

<template>
  <PromptInput
    :value="costumeGen.input"
    :enrich-loading="costumeGen.enrichState.state === 'running'"
    :generate-loading="costumeGen.generateState.state === 'running'"
    @update:value="costumeGen.setInput($event)"
    @enrich="costumeGen.enrich()"
    @generate="costumeGen.generate()"
  >
    <template #param-settings>
      <ParamsSettings
        v-for="(paramSetting, key) in costumeParamSettings"
        :key="key"
        type="selector"
        :value="costumeGen.settings[key]"
        :options="paramSetting.options"
        :tips="paramSetting.tips"
        @update:value="costumeGen.setSettings({ [key]: $event })"
      />
    </template>
  </PromptInput>
</template>

<style lang="scss" scoped></style>
