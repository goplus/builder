<template>
  <UIEditorSpriteItem :img-src="imgSrc" :img-loading="imgLoading" :name="item.name" :selected="selected" />
</template>

<script setup lang="ts">
import { UIEditorSpriteItem } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import { Sprite } from '@/models/sprite'

const props = defineProps<{
  item: Sprite
  selected?: boolean
}>()
const [imgSrc, imgLoading] = useFileUrl(() => props.item.defaultCostume?.img)
</script>
