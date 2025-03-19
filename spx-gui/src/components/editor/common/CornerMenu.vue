<template>
  <UIDropdown trigger="click">
    <template #trigger>
      <UICornerIcon :color="color" type="more" />
    </template>
    <UIMenu>
      <UIMenuItem @click="handleSaveToAssetLibrary.fn">{{
        $t({ en: 'Save to asset library', zh: '保存到素材库' })
      }}</UIMenuItem>
      <UIMenuItem :disabled="!removable" @click="emit('remove')">{{ $t({ en: 'Remove', zh: '删除' }) }}</UIMenuItem>
    </UIMenu>
  </UIDropdown>
</template>
<script setup lang="ts">
import { useSaveAssetToLibrary } from '@/components/asset'
import { UIDropdown, UICornerIcon, UIMenu, UIMenuItem, type Color } from '@/components/ui'
import type { Backdrop } from '@/models/backdrop'
import type { Sound } from '@/models/sound'
import type { Sprite } from '@/models/sprite'
import { useMessageHandle } from '@/utils/exception'

const props = defineProps<{
  item: Backdrop | Sound | Sprite
  removable: boolean
  color: Color
}>()

const emit = defineEmits<{
  remove: []
}>()

const saveAssetToLibrary = useSaveAssetToLibrary()

const handleSaveToAssetLibrary = useMessageHandle(
  async () => {
    await saveAssetToLibrary(props.item)
  },
  {
    en: 'Failed to save to asset library',
    zh: '保存至素材库失败'
  }
)
</script>
