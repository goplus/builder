<script lang="ts" setup>
import { useMessageHandle } from '@/utils/exception'
import { useAsyncComputedLegacy } from '@/utils/utils'
import { createFileWithWebUrl, saveFileForWebUrl, selectFileWithUploadLimit } from '@/models/common/cloud'
import { fromNativeFile } from '@/models/common/file'
import { UIIcon, UIImg, UILoading } from '@/components/ui'

const props = defineProps<{
  thumbnail: string
}>()

const emit = defineEmits<{
  'update:thumbnail': [value: string]
}>()

const handleUpload = useMessageHandle(
  async () => {
    const nativeFile = await selectFileWithUploadLimit({ accept: ['.png', '.jpg', '.jpeg', '.gif', '.webp'] })
    const file = fromNativeFile(nativeFile)
    const webUrl = await saveFileForWebUrl(file)
    emit('update:thumbnail', webUrl)
  },
  {
    en: 'Failed to upload image',
    zh: '上传图片失败'
  }
)

const thumbnailUrl = useAsyncComputedLegacy(async (onCleanup) => {
  if (props.thumbnail === '') return null
  const file = createFileWithWebUrl(props.thumbnail)
  return file.url(onCleanup)
})
</script>

<template>
  <div class="thumbnail-uploader" @click="handleUpload.fn">
    <UILoading v-if="handleUpload.isLoading.value" />
    <template v-else>
      <UIImg v-if="thumbnailUrl != null" :src="thumbnailUrl" class="preview" size="contain" />
      <div v-else class="placeholder">
        <UIIcon type="plus" />
        {{ $t({ en: 'Click to upload', zh: '点击上传' }) }}
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.thumbnail-uploader {
  border: 1px dashed var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-2);
  cursor: pointer;
  overflow: hidden;
  transition: 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: var(--ui-color-primary-main);
    background: var(--ui-color-grey-400);
  }

  .preview {
    width: 100%;
    height: 100%;
  }

  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--ui-color-grey-700);
  }
}
</style>
