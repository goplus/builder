/**
 * @desc Picture Generation APIs for AI image generation
 */

import { apiBaseUrl } from '@/utils/env'
import { toText } from '@/models/common/file'
import { createFileWithUniversalUrl } from '@/models/common/cloud'

/** Image generation model types */
export type ImageModel = 'png' | 'svg'

/** Request payload for image generation */
export interface GenerateImageRequest {
  /** The text prompt describing the desired image */
  prompt: string
  /** Negative prompt for things to avoid */
  negative_prompt?: string
  /** Image theme (e.g., cartoon, realistic, etc.) */
  theme?: string
  /** AI provider (e.g., svgio, claude, recraft) */
  provider?: string
  /** Output format (svg, png, etc.) */
  format?: string
  /** Whether to skip translation */
  skip_translate?: boolean
  /** Image size (e.g., "512x512") */
  size?: string
  /** Sub-theme specification (e.g., hand-drawn) */
  substyle?: string
  /** Number of images to generate */
  n?: number
  top_k?: number
}

/** Response from backend API */
export interface GenerateImageResponse {
  id: string
  prompt: string
  negative_prompt?: string
  theme?: string
  svg_url: string
  png_url: string
  width: number
  height: number
  created_at: string
}

/**
 * 直接生成并返回SVG内容
 */
export async function generateSvgDirect(
  provider: string, //通过这个参数选择供应商:claude,recraft
  prompt: string,
  options?: {
    negative_prompt?: string
    theme?: string
    format?: string
    skip_translate?: boolean
    size?: string
    substyle?: string
    n?: number
    top_k?: number
  }
): Promise<{
  svgContents: { blob: string; svgContent: string }[]
  id: string
  width: number
  height: number
}> {
  const payload: GenerateImageRequest = {
    prompt,
    negative_prompt: options?.negative_prompt || 'text, watermark',
    theme: options?.theme,
    provider: provider,
    format: options?.format,
    skip_translate: options?.skip_translate,
    size: options?.size,
    substyle: options?.substyle,
    n: options?.n,
    top_k: options?.top_k
  }

  let url = ''
  url = apiBaseUrl + '/images/recommend'
  payload.provider = 'openai'
  if (options?.top_k) {
    payload.top_k = options.top_k
  } else {
    payload.top_k = 4
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Request failed: ${response.status} ${response.statusText} - ${errorText}`)
  }
  // 获取后端返回的原始数据
  const backendResponse = await response.json()

  // 将后端response整理成所需的数组格式
  const imageUrls = backendResponse.results.map((result: any) => result.image_path)

  async function convertKodoUrlToBlobUrl(
    kodoUrl: string,
    fileName?: string
  ): Promise<{ blob: string; svgContent: string }> {
    // 1. 创建 File 实例
    const file = createFileWithUniversalUrl(kodoUrl, fileName)

    // 2. 获取SVG文本内容
    const svgContent = await toText(file)

    // 3. 获取 blob URL
    const blobUrl = await new Promise<string>((resolve, reject) => {
      let cleanup: (() => void) | null = null

      file
        .url((disposer) => {
          cleanup = disposer
        })
        .then((url) => {
          resolve(url)
        })
        .catch((error) => {
          reject(error)
        })

      // 设置超时
      const timeoutId = setTimeout(() => {
        cleanup?.() // 清理资源
        reject(new Error('获取 blob URL 超时'))
      }, 10000)

      // 成功后清除超时
      Promise.resolve().then(() => {
        clearTimeout(timeoutId)
      })
    })

    // 4. 返回包含blob和svgContent的对象
    return {
      blob: blobUrl,
      svgContent: svgContent
    }
  }

  // 这个数组的每个元素都是由上面的 kodo 链接转换得到的 blob 链接
  const svgContents: { blob: string; svgContent: string }[] = []
  for (let index = 0; index < imageUrls.length; index++) {
    const s = imageUrls[index]
    // 假设 s 是 kodo 链接
    const result = await convertKodoUrlToBlobUrl(s)
    svgContents.push({
      blob: result.blob,
      svgContent: result.svgContent
    })
  }

  return {
    svgContents: svgContents,
    id: '',
    width: 512,
    height: 512
  }
}
