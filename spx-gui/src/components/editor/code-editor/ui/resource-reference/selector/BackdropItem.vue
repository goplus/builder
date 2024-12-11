<template>
  <UIEditorBackdropItem :img-src="imgSrc" :img-loading="imgLoading" :name="item.name" :selected="selected" />
</template>

<script setup lang="ts">
import { UIEditorBackdropItem } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { Backdrop } from '@/models/backdrop'

const props = defineProps<{
  item: Backdrop
  selected: boolean
}>()
const [imgSrc, imgLoading] = useFileUrl(() => props.item.img)
</script>
