<script setup lang="ts">
import { useSaveAssetToLibrary } from '@/components/asset'
import { useMessageHandle } from '@/utils/exception'
import { UIMenuItem } from '@/components/ui'

import type { AssetModel } from '@/models/common/asset'

const props = defineProps<{
  item: AssetModel
}>()

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
    v-radar="{ name: 'Save to asset library', desc: 'Click to save the item to asset library' }"
    @click="handleSaveToAssetLibrary"
  >
    {{ $t({ en: 'Save to asset library', zh: '保存到素材库' }) }}
  </UIMenuItem>
</template>
