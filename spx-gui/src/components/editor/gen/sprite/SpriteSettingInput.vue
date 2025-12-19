<script lang="ts" setup>
import type { SpriteGen } from '@/models/gen/sprite-gen'
import { computed } from 'vue'
import PromptInput from '../common/PromptInput.vue'
import ParamsSettings from '../common/param-settings/ParamsSettings.vue'
import { spriteParamSettings } from '../common/param-settings/data'

const props = defineProps<{
  spriteGen: SpriteGen
}>()

const defaultCostume = computed(() => props.spriteGen.genDefaultCostume())
</script>

<template>
  <PromptInput
    :value="spriteGen.input"
    :enrich-loading="spriteGen.enrichState.state === 'running'"
    :generate-loading="defaultCostume.generateState.state === 'running'"
    @update:value="spriteGen.setInput($event)"
    @enrich="spriteGen.enrich()"
    @generate="defaultCostume.generate()"
  >
    <template #param-settings>
      <ParamsSettings
        v-for="(paramSetting, key) in spriteParamSettings"
        :key="key"
        type="selector"
        :value="spriteGen.settings[key]"
        :options="paramSetting.options"
        :tips="paramSetting.tips"
        @update:value="spriteGen.setSettings({ [key]: $event })"
      />
    </template>
  </PromptInput>
</template>

<style lang="scss" scoped></style>
