<script setup lang="ts">
import { computed } from 'vue'
import { useSaveAssetToLibrary } from '@/components/asset'
import { useMessageHandle } from '@/utils/exception'
import { UIMenuItem } from '@/components/ui'

import type { AssetModel } from '@/models/common/asset'
import { Sprite } from '@/models/sprite'
import { Backdrop } from '@/models/backdrop'
import { Sound } from '@/models/sound'

const props = defineProps<{
  item: AssetModel
}>()

const assetType = computed(() => getAssetType(props.item))

function getAssetType(item: AssetModel) {
  if (item instanceof Backdrop) {
    return 'backdrop'
  } else if (item instanceof Sound) {
    return 'sound'
  } else if (item instanceof Sprite) {
    return 'sprite'
  }
  throw new Error(`Unknown asset type`)
}

const saveAssetToLibrary = useSaveAssetToLibrary()
const { fn: handleSaveToAssetLibrary } = useMessageHandle(
  async () => {
    await saveAssetToLibrary(props.item)
  },
  {
    en: 'Failed to save to asset library',
    zh: '保存至素材库失败'
  }
)
</script>

<template>
  <UIMenuItem
    v-radar="{
      name: 'Save to asset library',
      desc: `Click to save the ${assetType} to asset library`
    }"
    @click="handleSaveToAssetLibrary"
  >
    {{ $t({ en: 'Save to asset library', zh: '保存到素材库' }) }}
  </UIMenuItem>
</template>
