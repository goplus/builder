<template>
  <main class="backdrop-detail">
    <h4 class="name">
      <AssetName>{{ backdrop.name }}</AssetName>
      <UIIcon
        class="edit-icon"
        :title="$t({ en: 'Rename', zh: '重命名' })"
        type="edit"
        @click="handleNameEdit"
      />
    </h4>
    <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
  </main>
</template>

<script setup lang="ts">
import { UIImg, UIIcon, useModal } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { Backdrop } from '@/models/backdrop'
import AssetName from '@/components/asset/AssetName.vue'
import BackdropRenameModal from './BackdropRenameModal.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{
  backdrop: Backdrop
}>()

const editorCtx = useEditorCtx()
const renameBackdrop = useModal(BackdropRenameModal)

function handleNameEdit() {
  renameBackdrop({
    backdrop: props.backdrop,
    project: editorCtx.project
  })
}

const [imgSrc, imgLoading] = useFileUrl(() => props.backdrop.img)
</script>

<style lang="scss" scoped>
.backdrop-detail {
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background-color: var(--ui-color-grey-200);
}

.name {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.img {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 8px;
}
</style>
