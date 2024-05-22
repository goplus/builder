<template>
  <EditorItem :selected="selected" color="sprite">
    <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
    <EditorItemName class="name">{{ costume.name }}</EditorItemName>
    <UICornerIcon
      v-show="selected && removable"
      color="sprite"
      type="trash"
      @click.stop="handelRemove"
    />
  </EditorItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIImg, UICornerIcon } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { Costume } from '@/models/costume'
import type { Sprite } from '@/models/sprite'
import EditorItem from '../common/EditorItem.vue'
import EditorItemName from '../common/EditorItemName.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{
  costume: Costume
  sprite: Sprite
  selected: boolean
}>()

const editorCtx = useEditorCtx()
const [imgSrc, imgLoading] = useFileUrl(() => props.costume.img)

const removable = computed(() => props.sprite.costumes.length > 1)

function handelRemove() {
  editorCtx.project.history.doAction(
    { en: 'removeCostume', zh: 'removeCostume' },
    () => props.sprite.removeCostume(props.costume.name)
  )
}
</script>

<style lang="scss" scoped>
.img {
  margin: 0 0 2px;
  width: 60px;
  height: 60px;
}
.name {
  padding: 4px 8px 2px;
}
</style>
