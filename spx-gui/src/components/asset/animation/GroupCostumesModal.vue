<template>
  <UIFormModal
    style="width: 1034px"
    :visible="visible"
    :title="
      $t({
        en: 'Group costumes as animation',
        zh: '将造型合并为动画'
      })
    "
    :body-style="{ padding: '0' }"
    @update:visible="emit('cancelled')"
  >
    <div class="container">
      <ul class="costume-list">
        <CostumeItem
          v-for="costume in props.sprite.costumes"
          :key="costume.id"
          :costume="costume"
          :selected="selectedCostumeSet.has(costume)"
          @click="handleCostumeClick(costume)"
        />
      </ul>
      <div class="sep"></div>
      <div class="preview">
        <UIEmpty v-if="selectedCostumes.length === 0" size="medium">
          {{ $t({ en: 'Select costumes to continue', zh: '请选择造型' }) }}
        </UIEmpty>
        <AnimationPlayer
          v-else
          class="player"
          :costumes="selectedCostumes"
          :duration="duration"
          :sound="null"
        />
      </div>
    </div>
    <div class="footer">
      <div class="spacer" />
      <UICheckbox v-model:checked="removeCostumes">
        <span>
          {{
            $t({
              en: 'Remove chosen costumes from the sprite’s costume list',
              zh: '从角色的造型列表删除所选造型'
            })
          }}
        </span>
      </UICheckbox>
      <UIButton size="large" :disabled="selectedCostumeSet.size === 0" @click="handleConfirm">
        {{ $t({ en: 'Add animation', zh: '添加动画' }) }}
      </UIButton>
    </div>
  </UIFormModal>
</template>
<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { UIButton, UICheckbox, UIEmpty, UIFormModal } from '@/components/ui'
import type { Costume } from '@/models/costume'
import type { Sprite } from '@/models/sprite'
import { defaultFps } from '@/models/animation'
import AnimationPlayer from '@/components/editor/sprite/animation/AnimationPlayer.vue'
import CostumeItem from './CostumeItem.vue'

const props = defineProps<{
  visible: boolean
  sprite: Sprite
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [
    {
      selectedCostumes: Costume[]
      removeCostumes: boolean
    }
  ]
}>()

const removeCostumes = ref(true)

const selectedCostumeSet = reactive<Set<Costume>>(new Set())
const selectedCostumes = computed(() => {
  const costumes = []
  // By this way we can keep the order of the costumes
  for (const costume of props.sprite.costumes) {
    if (selectedCostumeSet.has(costume)) {
      costumes.push(costume)
    }
  }
  return costumes
})
const duration = computed(() => selectedCostumes.value.length / defaultFps)

const handleCostumeClick = (costume: Costume) => {
  if (selectedCostumeSet.has(costume)) {
    selectedCostumeSet.delete(costume)
  } else {
    selectedCostumeSet.add(costume)
  }
}

const handleConfirm = () => {
  emit('resolved', {
    selectedCostumes: selectedCostumes.value,
    removeCostumes: removeCostumes.value
  })
}
</script>
<style lang="scss" scoped>
.container {
  min-height: 476px;
  max-height: 600px;
  display: flex;
}

.costume-list {
  padding: 20px 0 20px 24px;
  flex: 1 1 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-content: flex-start;
  overflow-y: auto;
}

.sep {
  margin: 20px 0;
  width: 1px;
  align-self: stretch;
  background-color: var(--ui-color-dividing-line-2);
}

.preview {
  padding: 20px 24px;
  flex: 0 0 402px;
  align-self: stretch;

  .player {
    width: 100%;
    height: 100%;
  }
}

.footer {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 20px 24px;
}

.spacer {
  flex: 1;
}
</style>
