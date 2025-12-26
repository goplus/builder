<script lang="ts" setup>
import type { BackdropGen } from '@/models/gen/backdrop-gen'
import { UIButton } from '@/components/ui'
import SettingsInput from '../common/SettingsInput.vue'
import PerspectiveInput from '../common/PerspectiveInput.vue'
import ArtStyleInput from '../common/ArtStyleInput.vue'
import BackdropCategoryInput from './BackdropCategoryInput.vue'

defineProps<{
  gen: BackdropGen
  onlyIcon?: boolean
}>()
</script>

<template>
  <SettingsInput
    :description="gen.settings.description"
    :enriching="gen.enrichState.status === 'running'"
    @update:description="gen.setSettings({ description: $event })"
    @enrich="gen.enrich()"
  >
    <template #param-settings>
      <BackdropCategoryInput
        :value="gen.settings.category"
        :only-icon="onlyIcon"
        @update:value="gen.setSettings({ category: $event })"
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
    </template>
    <template #submit>
      <UIButton :loading="gen.generateState.status === 'running'" @click="gen.generate()">{{
        $t({ zh: '生成', en: 'Generate' })
      }}</UIButton>
    </template>
  </SettingsInput>
</template>

<style lang="scss" scoped></style>
