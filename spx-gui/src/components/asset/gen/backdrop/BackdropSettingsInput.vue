<script lang="ts" setup>
import type { BackdropGen } from '@/models/gen/backdrop-gen'
import { UIButton } from '@/components/ui'
import SettingsInput from '../common/SettingsInput.vue'
import PerspectiveInput from '../common/PerspectiveInput.vue'
import ArtStyleInput from '../common/ArtStyleInput.vue'
import BackdropCategoryInput from './BackdropCategoryInput.vue'

defineProps<{
  gen: BackdropGen
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
      <BackdropCategoryInput :value="gen.settings.category" @update:value="gen.setSettings({ category: $event })" />
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
