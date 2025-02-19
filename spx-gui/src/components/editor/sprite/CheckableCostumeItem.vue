<template>
  <UIEditorSpriteItem :name="costume.name" :selectable="{ selected: checked }" color="primary">
    <template #img="{ style }">
      <UIImg :style="style" :src="imgSrc" :loading="imgLoading" />
    </template>
    <UICornerIcon v-show="checked" type="check" color="primary" />
  </UIEditorSpriteItem>
</template>

<script setup lang="ts">
import { useFileUrl } from '@/utils/file'
import type { Costume } from '@/models/costume'
import { UIImg, UICornerIcon, UIEditorSpriteItem } from '@/components/ui'

const props = defineProps<{
  costume: Costume
  checked: boolean
}>()

const [imgSrc, imgLoading] = useFileUrl(() => props.costume.img)
</script>
