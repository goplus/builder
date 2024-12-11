<template>
  <UIEditorSpriteItem :selected="selected" :img-src="imgSrc" :img-loading="imgLoading" :name="item.name" />
</template>

<script setup lang="ts">
import { UIEditorSpriteItem } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { Costume } from '@/models/costume'

const props = defineProps<{
  item: Costume
  selected: boolean
}>()
const [imgSrc, imgLoading] = useFileUrl(() => props.item.img)
</script>
