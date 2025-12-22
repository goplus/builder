<script lang="ts" setup>
import { computed } from 'vue'
import type { AnimationItem, CostumeItem, SpriteGen } from '@/models/gen/sprite-gen'
import GenModal from '../common/GenModal.vue'
import GenPanel from '../common/GenPanel.vue'
import { UIButton } from '@/components/ui'
import CostumeSettingInput from './CostumeSettingInput.vue'
import AnimationSettingInput from './AnimationSettingInput.vue'
import ListItemWrapper from '../common/ListItemWrapper.vue'
import CostumeGenItem from './CostumeGenItem.vue'
import AnimationGenItem from './AnimationGenItem.vue'
import { ref } from 'vue'
import CostumeGenPreview from './CostumeGenPreview.vue'
import AnimationGenPreview from './AnimationGenPreview.vue'
import CheckerboardBackground from '@/components/editor/sprite/CheckerboardBackground.vue'

const props = defineProps<{
  visible: boolean
  spriteGen: SpriteGen
}>()

const emit = defineEmits<{
  resolved: [void]
  cancelled: []
}>()

const selectedCostumeName = ref<string | null>(null)
const selectedCostumeItem = computed(() =>
  selectedCostumeName.value != null ? props.spriteGen.getCostume(selectedCostumeName.value) : null
)

const selectedAnimationName = ref<string | null>(null)
const selectedAnimationItem = computed(() =>
  selectedAnimationName.value != null ? props.spriteGen.getAnimation(selectedAnimationName.value) : null
)

function handleCostumeClick(costumeItem: CostumeItem) {
  selectedAnimationName.value = null
  selectedCostumeName.value = costumeItem.settings.name
  if (costumeItem.gen == null) {
    props.spriteGen.genCostume(costumeItem.settings.name)
  }
}

function handleAnimationClick(animationItem: AnimationItem) {
  selectedCostumeName.value = null
  selectedAnimationName.value = animationItem.settings.name
  if (animationItem.gen == null) {
    props.spriteGen.genAnimation(animationItem.settings.name)
  }
}

function addCostumeItem() {}
function addAnimationItem() {}
</script>

<template>
  <GenModal
    :title="$t({ zh: '生成精灵', en: 'Sprite Generator' })"
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <GenPanel>
      <template #left>
        <div class="gen-list">
          <ListItemWrapper @add="addCostumeItem">
            <template #title>{{ $t({ zh: '造型', en: 'Costume' }) }}</template>
            <CostumeGenItem
              v-for="costumeItem in spriteGen.costumes"
              :key="costumeItem.settings.name"
              :active="selectedCostumeName === costumeItem.settings.name"
              :costume-item="costumeItem"
              @click="handleCostumeClick(costumeItem)"
            />
          </ListItemWrapper>

          <ListItemWrapper @add="addAnimationItem">
            <template #title>{{ $t({ zh: '动画', en: 'Animation' }) }}</template>
            <AnimationGenItem
              v-for="animationItem in spriteGen.animations"
              :key="animationItem.settings.name"
              :active="selectedAnimationName === animationItem.settings.name"
              :animation-item="animationItem"
              @click="handleAnimationClick(animationItem)"
            />
          </ListItemWrapper>
        </div>

        <div class="gen-settings">
          <CostumeSettingInput v-if="selectedCostumeItem?.gen != null" :costume-gen="selectedCostumeItem.gen" />
          <AnimationSettingInput v-if="selectedAnimationItem?.gen != null" :animation-gen="selectedAnimationItem.gen" />
        </div>
      </template>
      <template #right>
        <div class="gen-preview">
          <CheckerboardBackground class="background" />
          <CostumeGenPreview
            v-if="selectedCostumeItem != null"
            :sprite-gen="spriteGen"
            :costume-item="selectedCostumeItem"
          />
          <AnimationGenPreview
            v-if="selectedAnimationItem != null"
            :sprite-gen="spriteGen"
            :animation-item="selectedAnimationItem"
          />
        </div>
      </template>
    </GenPanel>

    <template #footer>
      <UIButton color="secondary">{{ $t({ zh: '收起', en: 'Collapse' }) }}</UIButton>
      <UIButton>{{ $t({ zh: '采用', en: 'Use' }) }}</UIButton>
    </template>
  </GenModal>
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
