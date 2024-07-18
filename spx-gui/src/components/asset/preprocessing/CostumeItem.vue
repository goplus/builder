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

<style lang="scss" scoped>
.img {
  width: 60px;
  height: 60px;
}

.name {
  margin-top: 2px;
  font-size: 10px;
  line-height: 1.6;
  padding: 4px 8px 2px;

  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-align: center;
  text-overflow: ellipsis;
  color: var(--ui-color-title);
}
</style>
