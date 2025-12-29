<script lang="ts" setup>
import { computed } from 'vue'
import { UIButton } from '@/components/ui'
import type { CostumeGen } from '@/models/gen/costume-gen'
import SettingsInput from '../common/SettingsInput.vue'
import ArtStyleInput from '../common/ArtStyleInput.vue'
import PerspectiveInput from '../common/PerspectiveInput.vue'
import FacingInput from './FacingInput.vue'

const props = defineProps<{
  gen: CostumeGen
}>()

// TODO: implement readonly mode
const readonly = computed(() => props.gen.result != null)
</script>

<template>
  <SettingsInput
    :description="gen.settings.description"
    :enriching="gen.enrichState.status === 'running'"
    @update:description="gen.setSettings({ description: $event })"
    @enrich="gen.enrich()"
  >
    <template #extra>
      <FacingInput :value="gen.settings.facing" @update:value="gen.setSettings({ facing: $event })" />
      <ArtStyleInput :value="gen.settings.artStyle" @update:value="gen.setSettings({ artStyle: $event })" />
      <PerspectiveInput :value="gen.settings.perspective" @update:value="gen.setSettings({ perspective: $event })" />
    </template>
    <template v-if="!readonly" #submit>
      <UIButton :loading="gen.generateState.status === 'running'" @click="gen.generate()">{{
        $t({ zh: '生成', en: 'Generate' })
      }}</UIButton>
    </template>
  </SettingsInput>
</template>

<style lang="scss" scoped></style>
