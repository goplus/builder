<template>
  <EditorItemDetail :name="costume.name" @rename="handleRename">
    <div class="img-wrapper">
      <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
    </div>
  </EditorItemDetail>
</template>

<script setup lang="ts">
import { UIImg, useModal } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { Costume } from '@/models/costume'
import type { Sprite } from '@/models/sprite'
import EditorItemDetail from '../common/EditorItemDetail.vue'
import CostumeRenameModal from './CostumeRenameModal.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{
  costume: Costume
  sprite: Sprite
}>()

const editorCtx = useEditorCtx()
const renameCostume = useModal(CostumeRenameModal)

function handleRename() {
  renameCostume({
    costume: props.costume,
    sprite: props.sprite,
    project: editorCtx.project
  })
}

const [imgSrc, imgLoading] = useFileUrl(() => props.costume.img)
</script>

<style lang="scss" scoped>
.img-wrapper {
  width: 100%;
  aspect-ratio: 4 / 3;
  background-image: url(./costume-bg.png);
}
.img {
  width: 100%;
  height: 100%;
}
</style>
