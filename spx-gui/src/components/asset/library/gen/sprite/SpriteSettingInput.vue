<script lang="ts" setup>
import type { SpriteGen } from '@/models/gen/sprite-gen'
import { computed, useSlots } from 'vue'
import PromptInput from '../common/PromptInput.vue'
import ParamsSettings from '../common/param-settings/ParamsSettings.vue'
import { spriteParamSettings } from '../common/param-settings/data'
import { UIButton } from '@/components/ui'

const props = defineProps<{
  spriteGen: SpriteGen
}>()

const defaultCostume = computed(() => props.spriteGen.genDefaultCostume())

const slots = useSlots()
</script>

<template>
  <PromptInput
    :value="spriteGen.input"
    :loading="spriteGen.enrichState.state === 'running'"
    @update:value="spriteGen.setInput($event)"
    @enrich="spriteGen.enrich()"
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
    <template #buttons>
      <slot v-if="slots.buttons != null" name="buttons"></slot>
      <UIButton v-else :loading="defaultCostume.generateState.state === 'running'" @click="defaultCostume.generate()">{{
        $t({ zh: '生成', en: 'Generate' })
      }}</UIButton>
    </template>
  </PromptInput>
</template>

<style lang="scss" scoped></style>
