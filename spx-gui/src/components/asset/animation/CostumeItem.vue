<template>
  <UIEditorSpriteItem
    color="primary"
    :selected="selected"
    :img-src="imgSrc"
    :img-loading="imgLoading"
    :name="costume.name"
  >
    <UICornerIcon v-show="selected" type="check" />
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

<style lang="scss" scoped>
.img {
  flex: 1;
}

.name-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 32px;
  width: 100%;
}
</style>
