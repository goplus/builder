<script setup lang="ts">
import { computed } from 'vue'
import { AssetType, type AssetData } from '@/apis/asset'
import { UILoading } from '@/components/ui'
import { humanizeAssetType } from '@/models/spx/common/asset'

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

const entityMessage = computed(() => humanizeAssetType(props.type))
</script>

<template>
  <UILoading v-if="loading" />
  <div v-else class="flex flex-col items-center gap-3">
    <template v-if="suggestions.length > 0">
      <ul class="m-0 list-none flex flex-nowrap items-center justify-center gap-2 p-0">
        <template v-for="asset in suggestions" :key="asset.id">
          <slot name="item" :asset="asset" :selected="isSelected(asset)" :on-click="() => emit('toggle', asset)"></slot>
        </template>
      </ul>
      <p class="text-center text-xs text-hint-2">
        {{
          $t({
            en: `Use a suggested ${entityMessage.en} from the library or generate a new one.`,
            zh: `素材库里有相关${entityMessage.zh}。你可以选一个采用，也可以生成一个新的。`
          })
        }}
      </p>
    </template>
    <p v-else-if="keyword.length > 0" class="mt-14 text-center text-xs text-hint-2">
      {{
        $t({
          en: `No matching ${entityMessage.en}s found in the asset library. You can continue generating.`,
          zh: `素材库中未找到匹配的${entityMessage.zh}，你可以继续生成。`
        })
      }}
    </p>
  </div>
</template>
