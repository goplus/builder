<script lang="ts" setup>
import { computed } from 'vue'
import type { BackdropGen } from '@/models/gen/backdrop-gen'
import { UIButton } from '@/components/ui'
import SettingsInput from '../common/SettingsInput.vue'
import PerspectiveInput from '../common/PerspectiveInput.vue'
import ArtStyleInput from '../common/ArtStyleInput.vue'
import BackdropCategoryInput from './BackdropCategoryInput.vue'

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
    :description="gen.settings.description"
    :enriching="gen.enrichState.status === 'running'"
    :description-placeholder="descriptionPlaceholder"
    :disabled="disabled || submitting"
    @update:description="gen.setSettings({ description: $event })"
    @enrich="gen.enrich()"
  >
    <template #extra>
      <BackdropCategoryInput :value="gen.settings.category" @update:value="gen.setSettings({ category: $event })" />
      <ArtStyleInput :value="gen.settings.artStyle" @update:value="gen.setSettings({ artStyle: $event })" />
      <PerspectiveInput :value="gen.settings.perspective" @update:value="gen.setSettings({ perspective: $event })" />
    </template>
    <template #submit>
      <UIButton :disabled="submitDisabled" :loading="submitting" @click="handleSubmit">{{ $t(submitText) }}</UIButton>
    </template>
  </SettingsInput>
</template>

<style lang="scss" scoped></style>
