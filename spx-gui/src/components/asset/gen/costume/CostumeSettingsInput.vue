<script lang="ts" setup>
import { UIButton } from '@/components/ui'
import type { CostumeGen } from '@/models/gen/costume-gen'
import SettingsInput from '../common/SettingsInput.vue'
import ArtStyleInput from '../common/ArtStyleInput.vue'
import PerspectiveInput from '../common/PerspectiveInput.vue'
import FacingInput from './FacingInput.vue'

defineProps<{
  gen: CostumeGen
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
    <template #extra>
      <FacingInput
        :value="gen.settings.facing"
        :only-icon="onlyIcon"
        @update:value="gen.setSettings({ facing: $event })"
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
