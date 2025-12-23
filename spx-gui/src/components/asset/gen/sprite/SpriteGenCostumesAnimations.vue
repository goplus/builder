<!-- The step "gen more costumes & animations" for sprite generation -->

<script lang="ts" setup>
import { computed } from 'vue'
import type { AnimationItem, CostumeItem, SpriteGen } from '@/models/gen/sprite-gen'
import GenPanel from '../common/GenPanel.vue'
import CostumeSettingInput from '../costume/CostumeSettingsInput.vue'
import AnimationSettingInput from '../animation/AnimationSettingsInput.vue'
import ListItemWrapper from '../common/ListItemWrapper.vue'
import CostumeGenItem from '../costume/CostumeGenItem.vue'
import AnimationGenItem from '../animation/AnimationGenItem.vue'
import { ref } from 'vue'
import CostumeGenPreview from '../costume/CostumeGenPreview.vue'
import AnimationGenPreview from '../animation/AnimationGenPreview.vue'
import CheckerboardBackground from '@/components/editor/sprite/CheckerboardBackground.vue'

const props = defineProps<{
  visible: boolean
  gen: SpriteGen
}>()

const selectedCostumeName = ref<string | null>(null)
const selectedCostumeItem = computed(() =>
  selectedCostumeName.value != null ? props.gen.getCostume(selectedCostumeName.value) : null
)

const selectedAnimationName = ref<string | null>(null)
const selectedAnimationItem = computed(() =>
  selectedAnimationName.value != null ? props.gen.getAnimation(selectedAnimationName.value) : null
)

function handleCostumeClick(costumeItem: CostumeItem) {
  selectedAnimationName.value = null
  selectedCostumeName.value = costumeItem.settings.name
  if (costumeItem.gen == null) {
    props.gen.genCostume(costumeItem.settings.name)
  }
}

function handleAnimationClick(animationItem: AnimationItem) {
  selectedCostumeName.value = null
  selectedAnimationName.value = animationItem.settings.name
  if (animationItem.gen == null) {
    props.gen.genAnimation(animationItem.settings.name)
  }
}

function addCostumeItem() {}
function addAnimationItem() {}
</script>

<template>
  <GenPanel>
    <template #left>
      <div class="gen-list">
        <ListItemWrapper @add="addCostumeItem">
          <template #title>{{ $t({ zh: '造型', en: 'Costume' }) }}</template>
          <CostumeGenItem
            v-for="costumeItem in gen.costumes"
            :key="costumeItem.settings.name"
            :active="selectedCostumeName === costumeItem.settings.name"
            :costume-item="costumeItem"
            @click="handleCostumeClick(costumeItem)"
          />
        </ListItemWrapper>

        <ListItemWrapper @add="addAnimationItem">
          <template #title>{{ $t({ zh: '动画', en: 'Animation' }) }}</template>
          <AnimationGenItem
            v-for="animationItem in gen.animations"
            :key="animationItem.settings.name"
            :active="selectedAnimationName === animationItem.settings.name"
            :animation-item="animationItem"
            @click="handleAnimationClick(animationItem)"
          />
        </ListItemWrapper>
      </div>

      <div class="gen-settings">
        <CostumeSettingInput v-if="selectedCostumeItem?.gen != null" :gen="selectedCostumeItem.gen" />
        <AnimationSettingInput v-if="selectedAnimationItem?.gen != null" :gen="selectedAnimationItem.gen" />
      </div>
    </template>
    <template #right>
      <div class="gen-preview">
        <CheckerboardBackground class="background" />
        <!-- TODO: use `CostumeDetail` / `AnimationDetail` if costume / animation item already generated -->
        <CostumeGenPreview v-if="selectedCostumeItem != null" :gen="selectedCostumeItem.gen!" />
        <AnimationGenPreview v-if="selectedAnimationItem != null" :gen="selectedAnimationItem.gen!" />
      </div>
    </template>
  </GenPanel>
</template>

<style lang="scss" scoped>
.gen-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  max-height: 400px;
}

.gen-settings {
  margin-top: 60px;
}

.gen-preview {
  flex: 1;
  margin: 20px 24px;
  position: relative;
  border-radius: var(--ui-border-radius-1);
  overflow: hidden;

  .background {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
  }
}
</style>
