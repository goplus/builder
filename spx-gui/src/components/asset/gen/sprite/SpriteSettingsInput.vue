<script lang="ts" setup>
import { computed, useSlots } from 'vue'
import type { SpriteGen } from '@/models/gen/sprite-gen'
import { UIButton } from '@/components/ui'
import SettingsInput from '../common/SettingsInput.vue'
import SpriteCategoryInput from './SpriteCategoryInput.vue'
import ArtStyleInput from '../common/ArtStyleInput.vue'
import PerspectiveInput from '../common/PerspectiveInput.vue'

const props = defineProps<{
  gen: SpriteGen
}>()

const defaultCostumeGen = computed(() => props.gen.defaultCostume?.gen)

const slots = useSlots()
</script>

<template>
  <SettingsInput
    :description="gen.input"
    :enriching="gen.enrichState.state === 'running'"
    @update:description="gen.setInput($event)"
    @enrich="gen.enrich()"
  >
    <template #param-settings>
      <SpriteCategoryInput :value="gen.settings.category" @update:value="gen.setSettings({ category: $event })" />
      <ArtStyleInput :value="gen.settings.artStyle" @update:value="gen.setSettings({ artStyle: $event })" />
      <PerspectiveInput :value="gen.settings.perspective" @update:value="gen.setSettings({ perspective: $event })" />
    </template>
    <template #submit>
      <slot v-if="slots.submit != null" name="submit"></slot>
      <UIButton
        v-else
        :loading="defaultCostumeGen?.generateState.state === 'running'"
        @click="defaultCostumeGen?.generate()"
        >{{ $t({ zh: '生成', en: 'Generate' }) }}</UIButton
      >
    </template>
  </SettingsInput>
</template>

<style lang="scss" scoped></style>
