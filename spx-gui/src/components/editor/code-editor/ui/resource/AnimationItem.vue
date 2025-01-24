<template>
  <UIEditorSpriteItem :selected="selected" :img-src="imgSrc" :img-loading="imgLoading" :name="item.name" />
</template>

<script setup lang="ts">
import { UIEditorSpriteItem } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { Animation } from '@/models/animation'

const props = defineProps<{
  item: Animation
  selected?: boolean
}>()
const [imgSrc, imgLoading] = useFileUrl(() => props.item.costumes[0].img)
</script>
