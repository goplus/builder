import { useMessageHandle } from '@/utils/exception'
import { imgExts } from '@/utils/file'
import { selectFileWithUploadLimit } from '@/models/common/cloud'
import { fromNativeFile, type File } from '@/models/common/file'

const failureMessage = {
  en: 'Failed to select image',
  zh: '选择图片失败'
}

export function useReferenceImageUpload(onSelected: (file: File) => void) {
  return useMessageHandle(async () => {
    const nativeFile = await selectFileWithUploadLimit({ accept: imgExts })
    onSelected(fromNativeFile(nativeFile))
  }, failureMessage).fn
}
