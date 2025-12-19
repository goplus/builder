<script lang="ts" setup>
import type { SpriteGen } from '@/models/gen/sprite-gen'
import { computed } from 'vue'
import PromptInput from '../common/PromptInput.vue'
import ArtStyleSelector from '../common/settings/ArtStyleSelector.vue'
import type { SpriteSettings } from '@/apis/aigc'
import PerspectiveSelector from '../common/settings/PerspectiveSelector.vue'
import SpriteCategorySelector from '../common/settings/SpriteCategorySelector.vue'

const props = defineProps<{
  spriteGen: SpriteGen
}>()

// const spriteSettings = computed(() => props.spriteGen.settings)
const defaultCostume = computed(() => props.spriteGen.genDefaultCostume())

function updateSpriteSettings(updates: Partial<SpriteSettings>) {
  props.spriteGen.setSettings(updates)
}
</script>

<template>
  <PromptInput
    :value="spriteGen.input"
    :enrich-loading="spriteGen.enrichState.state === 'running'"
    :generate-loading="defaultCostume.generateState.state === 'running'"
    @update:value="spriteGen.setInput($event)"
    @enrich="spriteGen.enrich()"
    @generate="defaultCostume.generate()"
  >
    <template #settings>
      <SpriteCategorySelector
        :value="spriteGen.settings.category"
        @update:value="updateSpriteSettings({ category: $event })"
      />
      <ArtStyleSelector
        :value="spriteGen.settings.artStyle"
        @update:value="updateSpriteSettings({ artStyle: $event })"
      />
      <PerspectiveSelector
        :value="spriteGen.settings.perspective"
        @update:value="updateSpriteSettings({ perspective: $event })"
      />
    </template>
  </PromptInput>
</template>

<style lang="scss" scoped></style>
