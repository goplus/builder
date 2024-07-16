/**
 * @desc AI-related APIs of spx-backend
 */

import { loadImg } from '@/utils/dom'

// import { client } from './common'

export async function removeBackground(inputImgSrc: string) {
  // TODO: use real API
  const img = await loadImg(inputImgSrc, 6000)
  const canvas = new OffscreenCanvas(img.naturalWidth, img.naturalHeight)
  const ctx = canvas.getContext('2d')!
  ctx.filter = 'grayscale(100%)'
  ctx.drawImage(img, 0, 0)
  const blob = await canvas.convertToBlob()
  const outputImgUrl = URL.createObjectURL(blob)
  return new Promise<string>((resolve) => {
    setTimeout(() => resolve(outputImgUrl), 2000)
  })
}
