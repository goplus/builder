<script lang="ts" setup>
import { UIButton } from '@/components/ui'
import type { CostumeGen } from '@/models/gen/costume-gen'
import SettingsInput from '../common/SettingsInput.vue'
import ArtStyleInput from '../common/ArtStyleInput.vue'
import PerspectiveInput from '../common/PerspectiveInput.vue'
import FacingInput from './FacingInput.vue'

defineProps<{
  gen: CostumeGen
}>()
</script>

<template>
  <SettingsInput
    :description="gen.input"
    :loading="gen.enrichState.state === 'running'"
    @update:description="gen.setInput($event)"
    @enrich="gen.enrich()"
  >
    <template #param-settings>
      <FacingInput :value="gen.settings.facing" @update:value="gen.setSettings({ facing: $event })" />
      <ArtStyleInput :value="gen.settings.artStyle" @update:value="gen.setSettings({ artStyle: $event })" />
      <PerspectiveInput :value="gen.settings.perspective" @update:value="gen.setSettings({ perspective: $event })" />
    </template>
    <template #submit>
      <UIButton :loading="gen.generateState.state === 'running'" @click="gen.generate()">{{
        $t({ zh: '生成', en: 'Generate' })
      }}</UIButton>
    </template>
  </SettingsInput>
</template>

<style lang="scss" scoped></style>
