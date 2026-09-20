import { useMessageHandle } from '@/utils/exception'
import { selectFileWithUploadLimit } from '@/models/common/cloud'
import { fromNativeFile, type File } from '@/models/common/file'
import { referenceImageExts } from '@/models/spx/gen/reference-image'

const failureMessage = {
  en: 'Failed to select image',
  zh: '选择图片失败'
}

export function useReferenceImageUpload(onSelected: (file: File) => void) {
  return useMessageHandle(async () => {
    const nativeFile = await selectFileWithUploadLimit({ accept: referenceImageExts })
    onSelected(fromNativeFile(nativeFile))
  }, failureMessage).fn
}
