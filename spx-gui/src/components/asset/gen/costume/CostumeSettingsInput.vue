<script lang="ts" setup>
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import type { CostumeGen } from '@/models/spx/gen/costume-gen'
import { UIButton } from '@/components/ui'
import SettingsInput from '../common/SettingsInput.vue'
import ReferenceCostumeInput from '../common/ReferenceCostumeInput.vue'
import ArtStyleInput from '../common/ArtStyleInput.vue'
import PerspectiveInput from '../common/PerspectiveInput.vue'
import FacingInput from './FacingInput.vue'

const props = defineProps<{
  gen: CostumeGen
}>()

const readonly = computed(() => props.gen.result != null)
const handleEnrich = useMessageHandle(() => props.gen.enrich(), {
  en: 'Failed to enrich costume details',
  zh: '丰富造型细节失败'
}).fn
const buttonDisabled = computed(
  () => props.gen.enrichState.status === 'running' || props.gen.settings.description === ''
)
const submitting = computed(() => props.gen.generateState.status === 'running')
const submitText = computed(() => {
  if (props.gen.generateState.status === 'initial') return { en: 'Generate', zh: '生成' }
  return { en: 'Regenerate', zh: '重新生成' }
})
</script>

<template>
  <SettingsInput
    v-radar="{
      name: 'Costume generation settings',
      desc: 'Enter a costume description, or enrich details to generate a costume'
    }"
    :description="gen.settings.description"
    :enriching="gen.enrichState.status === 'running'"
    :readonly="readonly"
    :disabled="submitting"
    @update:description="gen.setSettings({ description: $event })"
    @enrich="handleEnrich"
  >
    <template #extra>
      <ReferenceCostumeInput
        :costumes="gen.sprite.costumes"
        :selected-id="gen.referenceCostume?.id ?? null"
        @update:selected-id="gen.setReferenceCostume($event)"
      />
      <FacingInput :value="gen.settings.facing" @update:value="gen.setSettings({ facing: $event })" />
      <ArtStyleInput :value="gen.settings.artStyle" @update:value="gen.setSettings({ artStyle: $event })" />
      <PerspectiveInput :value="gen.settings.perspective" @update:value="gen.setSettings({ perspective: $event })" />
    </template>
    <template #submit>
      <UIButton
        v-radar="{
          name: 'Submit',
          desc: 'Click to generate a costume'
        }"
        :disabled="buttonDisabled"
        :loading="submitting"
        @click="gen.generate()"
      >
        {{ $t(submitText) }}
      </UIButton>
    </template>
  </SettingsInput>
</template>
