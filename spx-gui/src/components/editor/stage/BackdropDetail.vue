<template>
  <EditorItemDetail :name="backdrop.name" @rename="handleRename">
    <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
  </EditorItemDetail>
</template>

<script setup lang="ts">
import { UIImg, useModal } from '@/components/ui'
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

function handleRename() {
  renameBackdrop({
    backdrop: props.backdrop,
    project: editorCtx.project
  })
}

const [imgSrc, imgLoading] = useFileUrl(() => props.backdrop.img)
</script>

<style lang="scss" scoped>
.img {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 8px;
}
</style>
