<script setup lang="ts">
import { computed } from 'vue'
import { AssetType, type AssetData } from '@/apis/asset'
import { UILoading } from '@/components/ui'

const props = defineProps<{
  type: AssetType
  loading: boolean
  keyword: string
  suggestions: AssetData[]
  selected: AssetData | null
}>()

const emit = defineEmits<{
  toggle: [AssetData]
}>()

function isSelected(asset: AssetData) {
  return props.selected?.id === asset.id
}

const entityMessages = {
  [AssetType.Backdrop]: { en: 'backdrop', zh: '背景' },
  [AssetType.Sprite]: { en: 'sprite', zh: '精灵' },
  [AssetType.Sound]: { en: 'sound', zh: '声音' }
}
const entityMessage = computed(() => entityMessages[props.type])
</script>

<template>
  <UILoading v-if="loading" />
  <div v-else class="flex flex-col items-center gap-3">
    <template v-if="suggestions.length > 0">
      <ul class="m-0 flex list-none flex-nowrap items-center justify-center gap-2 p-0">
        <template v-for="asset in suggestions" :key="asset.id">
          <slot name="item" :asset="asset" :selected="isSelected(asset)" :on-click="() => emit('toggle', asset)"></slot>
        </template>
      </ul>
      <p class="text-center text-12 text-hint-2">
        {{
          $t({
            en: `There are related ${entityMessage.en}s in the asset library. You can choose the one you like or continue generating.`,
            zh: `素材库中已有相关的${entityMessage.zh}，可以选择你喜欢的${entityMessage.zh}直接使用，或者继续生成。`
          })
        }}
      </p>
    </template>
    <p v-else-if="keyword.length > 0" class="mt-14 text-center text-12 text-hint-2">
      {{
        $t({
          en: `No matching ${entityMessage.en}s found in the asset library. You can continue generating.`,
          zh: `素材库中未找到匹配的${entityMessage.zh}，你可以继续生成。`
        })
      }}
    </p>
  </div>
</template>
