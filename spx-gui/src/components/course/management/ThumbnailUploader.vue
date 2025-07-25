<script lang="ts" setup>
import { ref } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { selectFileWithUploadLimit, saveFileForWebUrl, createFileWithWebUrl } from '@/models/common/cloud'
import { fromNativeFile } from '@/models/common/file'
import { useAsyncComputed } from '@/utils/utils'
import { UIIcon, UILoading, UIImg } from '@/components/ui'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const uploading = ref(false)

const handleUpload = useMessageHandle(
  async () => {
    uploading.value = true
    try {
      const nativeFile = await selectFileWithUploadLimit({ accept: ['.png', '.jpg', '.jpeg', '.gif', '.webp'] })
      const file = fromNativeFile(nativeFile)
      const webUrl = await saveFileForWebUrl(file)
      emit('update:modelValue', webUrl)
    } finally {
      uploading.value = false
    }
  },
  {
    en: 'Failed to upload image',
    zh: '上传图片失败'
  }
).fn

const displayUrl = useAsyncComputed(async (onCleanup) => {
  if (!props.modelValue) return null
  const file = createFileWithWebUrl(props.modelValue)
  return file.url(onCleanup)
})
</script>

<template>
  <div class="thumbnail-uploader" @click="handleUpload">
    <UILoading v-if="uploading" />
    <template v-else>
      <UIImg v-if="displayUrl" :src="displayUrl" class="preview" size="contain" />
      <div v-else class="placeholder">
        <UIIcon type="plus" class="icon" />
        <div class="text">
          {{ $t({ en: 'Click to upload', zh: '点击上传' }) }}
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.thumbnail-uploader {
  position: relative;
  width: 100%;
  height: 200px;
  border: 2px dashed var(--ui-color-grey-300);
  border-radius: 8px;
  background: var(--ui-color-grey-50);
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: var(--ui-color-primary);
    background: var(--ui-color-grey-100);
  }

  .preview {
    width: 100%;
    height: 100%;
  }

  .placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--ui-color-grey-600);

    .icon {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .text {
      font-size: 14px;
    }
  }
}
</style>
