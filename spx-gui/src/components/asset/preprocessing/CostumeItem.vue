<template>
  <UIEditorSpriteItem
    :name="costume.name"
    :selected="selected"
    color="primary"
    :img-src="imgSrc"
    :img-loading="imgLoading"
  >
    <UICornerIcon v-show="selected" color="primary" type="check" />
  </UIEditorSpriteItem>
</template>

<script setup lang="ts">
import { useFileUrl } from '@/utils/file'
import type { Costume } from '@/models/costume'
import { UICornerIcon, UIEditorSpriteItem } from '@/components/ui'

const props = defineProps<{
  selected: boolean
  costume: Costume
}>()

const [imgSrc, imgLoading] = useFileUrl(() => props.costume.img)
</script>
