<template>
  <UIFormModal
    style="width: 928px"
    :visible="true"
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
      <CostumeItem
        v-for="costume in props.sprite.costumes"
        :key="costume.name"
        :costume="costume"
        :selected="selectedCostumes.has(costume)"
        @click="handleCostumeClick(costume)"
      />
    </div>
    <div class="footer">
      <div class="spacer" />
      <UICheckbox v-model:checked="removeCostumes">
        <span>
          {{
            $t({
              en: 'Remove chosen costumes from the sprite’s costume list',
              zh: '从角色的造型列表中移除所选造型'
            })
          }}
        </span>
      </UICheckbox>
      <UIButton size="large" :disabled="selectedCostumes.size === 0" @click="handleConfirm">
        {{ $t({ en: 'Add animation', zh: '添加动画' }) }}
      </UIButton>
    </div>
  </UIFormModal>
</template>
<script setup lang="ts">
import { UIButton, UICheckbox, UIFormModal } from '@/components/ui'
import type { Costume } from '@/models/costume'
import { defineProps, defineEmits, ref, reactive } from 'vue'
import CostumeItem from './CostumeItem.vue'
import type { Sprite } from '@/models/sprite'

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

const selectedCostumes = reactive<Set<Costume>>(new Set())

const handleCostumeClick = (costume: Costume) => {
  if (selectedCostumes.has(costume)) {
    selectedCostumes.delete(costume)
  } else {
    selectedCostumes.add(costume)
  }
}

const handleConfirm = () => {
  // By this way we can keep the order of the costumes
  const costumes = []
  for (const costume of props.sprite.costumes) {
    if (selectedCostumes.has(costume)) {
      costumes.push(costume)
    }
  }

  emit('resolved', { selectedCostumes: costumes, removeCostumes: removeCostumes.value })
}
</script>
<style lang="scss" scoped>
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 20px 24px;
  overflow-y: auto;
  max-height: 600px;
  user-select: none;
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
