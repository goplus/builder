<template>
  <EditorItemDetail :name="backdrop.name" @rename="handleRename">
    <div class="w-full flex-[1_1_0] min-h-0 flex items-center justify-center">
      <img v-if="imgSrc != null" class="max-h-full max-w-full rounded-sm" :src="imgSrc" />
      <UILoading :visible="imgLoading" cover />
    </div>
  </EditorItemDetail>
</template>

<script setup lang="ts">
import { UILoading } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useFileUrl } from '@/utils/file'
import type { Backdrop } from '@/models/spx/backdrop'
import { useRenameBackdrop } from '@/components/asset'
import EditorItemDetail from '../../common/EditorItemDetail.vue'

const props = defineProps<{
  backdrop: Backdrop
}>()

const renameBackdrop = useRenameBackdrop()
const handleRename = useMessageHandle(() => renameBackdrop(props.backdrop), {
  en: 'Failed to rename backdrop',
  zh: '重命名背景失败'
}).fn

const [imgSrc, imgLoading] = useFileUrl(() => props.backdrop.img)
</script>
