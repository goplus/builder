<script setup lang="ts">
import type { AssetType, AssetData } from '@/apis/asset'
import { UILoading } from '@/components/ui'

const props = defineProps<{
  type: AssetType
  loading: boolean
  suggestions: AssetData[]
  selected: AssetData | null
}>()

const emit = defineEmits<{
  toggle: [AssetData]
}>()

function isSelected(asset: AssetData) {
  return props.selected?.id === asset.id
}
</script>

<template>
  <UILoading v-if="loading" />
  <div v-else class="asset-suggestions">
    <template v-if="suggestions.length > 0">
      <ul class="list">
        <template v-for="asset in suggestions" :key="asset.id">
          <slot name="item" :asset="asset" :selected="isSelected(asset)" :on-click="() => emit('toggle', asset)"></slot>
        </template>
      </ul>
      <p class="tip">
        <slot name="tip"></slot>
      </p>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.asset-suggestions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.list {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  justify-content: center;
  list-style: none;
  padding: 0;
  margin: 0;
}

.tip {
  text-align: center;
  font-size: 12px;
  color: var(--ui-color-hint-2);
}
</style>
