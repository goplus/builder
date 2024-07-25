<template>
  <EditorItemDetail :name="backdrop.name" @rename="handleRename">
    <div class="img-wrapper">
      <img v-if="imgSrc != null" class="img" :src="imgSrc" />
      <UILoading :visible="imgLoading" cover />
    </div>
  </EditorItemDetail>
</template>

<script setup lang="ts">
import { useModal, UILoading } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useFileUrl } from '@/utils/file'
import type { Backdrop } from '@/models/backdrop'
import { useEditorCtx } from '../EditorContextProvider.vue'
import EditorItemDetail from '../common/EditorItemDetail.vue'
import BackdropRenameModal from './BackdropRenameModal.vue'

const props = defineProps<{
  backdrop: Backdrop
}>()

const editorCtx = useEditorCtx()
const renameBackdrop = useModal(BackdropRenameModal)

const handleRename = useMessageHandle(
  () =>
    renameBackdrop({
      backdrop: props.backdrop,
      project: editorCtx.project
    }),
  { en: 'Failed to rename backdrop', zh: '重命名背景失败' }
).fn

const [imgSrc, imgLoading] = useFileUrl(() => props.backdrop.img)
</script>

<style lang="scss" scoped>
.img-wrapper {
  width: 100%;
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.img {
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
}
</style>
