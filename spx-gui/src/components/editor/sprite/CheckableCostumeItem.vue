<template>
  <UIEditorSpriteItem :name="costume.name" :selectable="{ selected: checked }">
    <template #img="{ style }">
      <UIImg :style="style" :src="imgSrc" :loading="imgLoading" />
    </template>
    <UICornerIcon v-show="checked" type="check" />
  </UIEditorSpriteItem>
</template>

<script setup lang="ts">
import { useImgFileUrl } from '@/utils/img'
import type { Costume } from '@/models/spx/costume'
import { UIImg, UICornerIcon, UIEditorSpriteItem } from '@/components/ui'

const props = defineProps<{
  costume: Costume
  checked: boolean
}>()

const [imgSrc, imgLoading] = useImgFileUrl(() => props.costume.img)
</script>
