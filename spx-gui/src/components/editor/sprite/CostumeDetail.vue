<template>
  <EditorItemDetail :name="costume.name" @rename="handleRename">
    <div class="img-wrapper">
      <CheckerboardBackground class="background" />
      <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
    </div>
  </EditorItemDetail>
</template>

<script setup lang="ts">
import { UIImg, useModal } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useFileUrl } from '@/utils/file'
import type { Costume } from '@/models/costume'
import type { Sprite } from '@/models/sprite'
import EditorItemDetail from '../common/EditorItemDetail.vue'
import CostumeRenameModal from './CostumeRenameModal.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import CheckerboardBackground from './CheckerboardBackground.vue'

const props = defineProps<{
  costume: Costume
  sprite: Sprite
}>()

const editorCtx = useEditorCtx()
const renameCostume = useModal(CostumeRenameModal)

const handleRename = useMessageHandle(
  () =>
    renameCostume({
      costume: props.costume,
      sprite: props.sprite,
      project: editorCtx.project
    }),
  { en: 'Failed to rename costume', zh: '重命名造型失败' }
).fn

const [imgSrc, imgLoading] = useFileUrl(() => props.costume.img)
</script>

<style lang="scss" scoped>
.img-wrapper {
  width: 100%;
  flex: 1 1 0;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.background {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
}

.img {
  width: 100%;
  height: 100%;
}
</style>
