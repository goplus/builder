<script lang="ts" setup>
import { useMessageHandle } from '@/utils/exception'
import { useAsyncComputed } from '@/utils/utils'
import { createFileWithUniversalUrl, saveFile, selectFileWithUploadLimit } from '@/models/common/cloud'
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
    const universalUrl = await saveFile(file)
    emit('update:thumbnail', universalUrl)
  },
  {
    en: 'Failed to upload image',
    zh: '上传图片失败'
  }
)

const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  if (props.thumbnail === '') return null
  const file = createFileWithUniversalUrl(props.thumbnail)
  return file.url(onCleanup)
})
</script>

<template>
  <div
    class="cursor-pointer flex items-center justify-center overflow-hidden rounded-md border border-dashed border-grey-400 transition-[border-color,background-color] duration-300 hover:border-primary-main hover:bg-grey-400"
    @click="handleUpload.fn"
  >
    <UILoading v-if="handleUpload.isLoading.value" />
    <template v-else>
      <UIImg v-if="thumbnailUrl != null" :src="thumbnailUrl" class="h-full w-full" size="contain" />
      <div v-else class="flex flex-col items-center gap-2 text-grey-700">
        <UIIcon type="plus" />
        {{ $t({ en: 'Click to upload', zh: '点击上传' }) }}
      </div>
    </template>
  </div>
</template>
