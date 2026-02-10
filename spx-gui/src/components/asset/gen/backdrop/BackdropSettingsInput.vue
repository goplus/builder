<script lang="ts" setup>
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import type { BackdropGen } from '@/models/spx/gen/backdrop-gen'
import SettingsInput from '../common/SettingsInput.vue'
import PerspectiveInput from '../common/PerspectiveInput.vue'
import ArtStyleInput from '../common/ArtStyleInput.vue'
import BackdropCategoryInput from './BackdropCategoryInput.vue'
import EnrichableSubmitButton from '../common/EnrichableSubmitButton.vue'

const props = withDefaults(
  defineProps<{
    gen: BackdropGen
    descriptionPlaceholder?: string
    // TODO: Clarify if disabled logic should live in this component or be delegated to parent
    disabled?: boolean
  }>(),
  {
    descriptionPlaceholder: undefined,
    disabled: false
  }
)

const emit = defineEmits<{
  submit: []
}>()

const submitDisabled = computed(
  () => props.disabled || props.gen.enrichState.status === 'running' || props.gen.settings.description === ''
)

const submitting = computed(() => props.gen.imagesGenState.status === 'running')
const enriching = computed(() => props.gen.enrichState.status === 'running')

const handleEnrich = useMessageHandle(() => props.gen.enrich(), {
  en: 'Failed to enrich backdrop details',
  zh: '丰富背景细节失败'
}).fn

function handleSubmit() {
  emit('submit') // For asset-library-modal, listen to event `submit` and do jump (from asset-library to backdrop-gen)
  props.gen.genImages()
}

const submitText = computed(() => {
  if (props.gen.imagesGenState.status === 'initial') return { en: 'Generate', zh: '生成' }
  return { en: 'Regenerate', zh: '重新生成' }
})
</script>

<template>
  <SettingsInput
    v-radar="{
      name: 'Backdrop generation settings',
      desc: 'Enter a backdrop description, or enrich details to generate a backdrop'
    }"
    :description="gen.settings.description"
    :enriching="enriching"
    :description-placeholder="descriptionPlaceholder"
    :disabled="disabled || submitting"
    @update:description="gen.setSettings({ description: $event })"
    @enrich="handleEnrich"
  >
    <template #extra>
      <BackdropCategoryInput :value="gen.settings.category" @update:value="gen.setSettings({ category: $event })" />
      <ArtStyleInput :value="gen.settings.artStyle" @update:value="gen.setSettings({ artStyle: $event })" />
      <PerspectiveInput :value="gen.settings.perspective" @update:value="gen.setSettings({ perspective: $event })" />
    </template>
    <template #submit>
      <EnrichableSubmitButton
        :radar="{ name: 'Submit', desc: 'Click to generate backdrop images' }"
        :enriched="gen.enrichState.status === 'finished'"
        :enriching="enriching"
        :disabled="submitDisabled"
        :loading="submitting"
        @enrich="handleEnrich"
        @submit="handleSubmit"
        >{{ $t(submitText) }}</EnrichableSubmitButton
      >
    </template>
  </SettingsInput>
</template>

<style lang="scss" scoped></style>
