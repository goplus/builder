<script lang="ts" setup>
import type { BackdropGen } from '@/models/gen/backdrop-gen'
import { UIButton } from '@/components/ui'
import SettingsInput from '../common/SettingsInput.vue'
import PerspectiveInput from '../common/PerspectiveInput.vue'
import ArtStyleInput from '../common/ArtStyleInput.vue'
import BackdropCategoryInput from './BackdropCategoryInput.vue'
import { computed } from 'vue'

const props = defineProps<{
  gen: BackdropGen
  descriptionPlaceholder?: string
}>()

const buttonDisabled = computed(
  () => props.gen.enrichState.status === 'running' || props.gen.settings.description === ''
)
const submitting = computed(() => props.gen.generateState.status === 'running')
</script>

<template>
  <SettingsInput
    :description="gen.settings.description"
    :enriching="gen.enrichState.status === 'running'"
    :description-placeholder="descriptionPlaceholder"
    :disabled="submitting"
    @update:description="gen.setSettings({ description: $event })"
    @enrich="gen.enrich()"
  >
    <template #param-settings>
      <BackdropCategoryInput :value="gen.settings.category" @update:value="gen.setSettings({ category: $event })" />
      <ArtStyleInput :value="gen.settings.artStyle" @update:value="gen.setSettings({ artStyle: $event })" />
      <PerspectiveInput :value="gen.settings.perspective" @update:value="gen.setSettings({ perspective: $event })" />
    </template>
    <template #submit>
      <UIButton :disabled="buttonDisabled" :loading="submitting" @click="gen.generate()">{{
        $t({ zh: '生成', en: 'Generate' })
      }}</UIButton>
    </template>
  </SettingsInput>
</template>

<style lang="scss" scoped></style>
