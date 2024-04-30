import { Disposble } from "@/models/common/disposable"

/** Convert arbitrary-type (supported by current browser) image content to type-`image/jpeg` content. */
export async function toJpeg(blob: Blob) {
  const d = new Disposble()
  return new Promise<Blob>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d')?.drawImage(img, 0, 0)
        canvas.toBlob(newBlob => {
          if (newBlob == null) {
            reject(new Error('toBlob failed'))
            return
          }
          resolve(newBlob)
        }, 'image/jpeg')
    }
    img.onerror = (e) => reject(new Error(`load image failed: ${e.toString()}`))
    const url = URL.createObjectURL(blob)
    d.addDisposer(() => URL.revokeObjectURL(url))
    img.src = url
  }).finally(() => {
    d.dispose()
  })
}
