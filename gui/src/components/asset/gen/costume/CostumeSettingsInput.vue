<script lang="ts" setup>
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { useEnsureSignedIn } from '@/utils/user'
import type { CostumeGen } from '@/models/spx/gen/costume-gen'
import { UIButton } from '@/components/ui'
import { useResourceWorkspace } from '@/components/editor/sprite/resource-workspace'
import SettingsInput from '../common/SettingsInput.vue'
import ReferenceImageInput from '../common/ReferenceImageInput.vue'
import ArtStyleInput from '../common/ArtStyleInput.vue'
import PerspectiveInput from '../common/PerspectiveInput.vue'
import FacingInput from './FacingInput.vue'

const workspace = useResourceWorkspace()
const props = defineProps<{
  gen: CostumeGen
}>()

const ensureSignedIn = useEnsureSignedIn()
const handleEnrich = useMessageHandle(
  async () => {
    await ensureSignedIn()
    return props.gen.enrich()
  },
  {
    en: 'Failed to enrich costume details',
    zh: '丰富造型细节失败'
  }
).fn
const handleGenerate = useMessageHandle(
  async () => {
    await ensureSignedIn()
    if (workspace != null && 'editHistory' in props.gen.parent) props.gen.parent.editHistory.record(props.gen)
    return props.gen.generate()
  },
  {
    en: 'Failed to generate costume',
    zh: '生成造型失败'
  }
).fn
const buttonDisabled = computed(
  () => props.gen.enrichState.status === 'running' || props.gen.settings.description === ''
)
const submitting = computed(() => props.gen.generateState.status === 'running')
const submitText = computed(() => {
  if (props.gen.result == null && props.gen.generateState.status === 'initial') return { en: 'Generate', zh: '生成' }
  return { en: 'Regenerate', zh: '重新生成' }
})
</script>

<template>
  <SettingsInput
    v-radar="{
      name: 'costume-generation-settings',
      desc: 'Enter a costume description, or enrich details to generate a costume'
    }"
    :description="gen.settings.description"
    :readonly="workspace == null && gen.result != null"
    :enriching="gen.enrichState.status === 'running'"
    :disabled="submitting"
    @update:description="gen.setSettings({ description: $event })"
    @enrich="handleEnrich"
  >
    <template #extra>
      <ReferenceImageInput
        :key="gen.id"
        :costumes="gen.sprite.costumes"
        :selection="gen.referenceImageSelection"
        :fallback-costume-id="gen.sprite.defaultCostume?.id ?? null"
        @update:selection="gen.setReferenceImageSelection($event)"
      />
      <FacingInput :value="gen.settings.facing" @update:value="gen.setSettings({ facing: $event })" />
      <ArtStyleInput :value="gen.settings.artStyle" @update:value="gen.setSettings({ artStyle: $event })" />
      <PerspectiveInput :value="gen.settings.perspective" @update:value="gen.setSettings({ perspective: $event })" />
    </template>
    <template #submit>
      <UIButton
        v-radar="{
          name: 'submit',
          desc: 'Click to generate a costume'
        }"
        :type="workspace?.canReview.value ? 'secondary' : 'primary'"
        :disabled="buttonDisabled"
        :loading="submitting"
        @click="handleGenerate"
      >
        {{ $t(submitText) }}
      </UIButton>
    </template>
  </SettingsInput>
</template>
