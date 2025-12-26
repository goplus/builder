<script lang="ts" setup>
import { computed } from 'vue'
import type { SpriteGen } from '@/models/gen/sprite-gen'
import { UIButton } from '@/components/ui'
import SettingsInput from '../common/SettingsInput.vue'
import SpriteCategoryInput from './SpriteCategoryInput.vue'
import ArtStyleInput from '../common/ArtStyleInput.vue'
import PerspectiveInput from '../common/PerspectiveInput.vue'

const props = defineProps<{
  gen: SpriteGen
}>()

const emit = defineEmits<{
  submit: []
}>()

const submitting = computed(() => props.gen.imagesGenState.status === 'running')

function handleSubmit() {
  emit('submit') // For asset-library-modal, listen to event `submit` and do jump (from asset-library to sprite-gen)
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
    @update:description="gen.setSettings({ description: $event })"
    @enrich="gen.enrich()"
  >
    <template #extra>
      <SpriteCategoryInput :value="gen.settings.category" @update:value="gen.setSettings({ category: $event })" />
      <ArtStyleInput :value="gen.settings.artStyle" @update:value="gen.setSettings({ artStyle: $event })" />
      <PerspectiveInput :value="gen.settings.perspective" @update:value="gen.setSettings({ perspective: $event })" />
    </template>
    <template #submit>
      <UIButton :loading="submitting" @click="handleSubmit">{{ $t(submitText) }}</UIButton>
    </template>
  </SettingsInput>
</template>

<style lang="scss" scoped></style>
