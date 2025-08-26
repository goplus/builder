/**
 * @desc Picture Generation APIs for AI image generation
 */

import { apiBaseUrl } from '@/utils/env'

// 简单的HTTP请求函数
async function picgcRequest(path: string, options: RequestInit = {}) {
  const url = apiBaseUrl + path
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Request failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  return response.json()
}

/** Image generation model types */
export type ImageModel = 'png' | 'svg'

/** Request payload for image generation */
export interface GenerateImageRequest {
  /** The text prompt describing the desired image */
  prompt: string
  /** Negative prompt for things to avoid */
  negative_prompt?: string
  /** Image style (e.g., cartoon, realistic, etc.) */
  style?: string
  /** AI provider (e.g., svgio, claude, recraft) */
  provider?: string
  /** Output format (svg, png, etc.) */
  format?: string
  /** Whether to skip translation */
  skip_translate?: boolean
  /** AI model to use (e.g., gpt-4) */
  model?: string
  /** Image size (e.g., "512x512") */
  size?: string
  /** Sub-style specification (e.g., hand-drawn) */
  substyle?: string
  /** Number of images to generate */
  n?: number
}

/** Response from backend API */
export interface GenerateImageResponse {
  id: string
  prompt: string
  negative_prompt?: string
  style?: string
  svg_url: string
  png_url: string
  width: number
  height: number
  created_at: string
}

//todo：弃用
export async function generateImage(
  prompt: string, 
  options?: {
    negative_prompt?: string
    style?: string
    provider?: string
    format?: string
    skip_translate?: boolean
    model?: string
    size?: string
    substyle?: string
    n?: number
  }
): Promise<GenerateImageResponse> {
  const payload: GenerateImageRequest = {
    prompt,
    negative_prompt: options?.negative_prompt || 'text, watermark',
    style: options?.style,
    provider: options?.provider,
    format: options?.format,
    skip_translate: options?.skip_translate,
    model: options?.model,
    size: options?.size,
    substyle: options?.substyle,
    n: options?.n
  }

  //生成图片的接口
  const response = await picgcRequest('/v1/images', {
    method: 'POST',
    body: JSON.stringify(payload)
  }) as GenerateImageResponse
  console.log('response', response)
  return response
}

/**
 * 直接生成并返回SVG内容
 */
export async function generateSvgDirect(
  provider: string,//通过这个参数选择供应商:claude,recraft
  prompt: string,
  options?: {
    negative_prompt?: string
    style?: string
    format?: string
    skip_translate?: boolean
    model?: string
    size?: string
    substyle?: string
    n?: number
  }
): Promise<{
  svgContent: string
  id: string
  width: number
  height: number
}> {
  const payload: GenerateImageRequest = {
    prompt,
    negative_prompt: options?.negative_prompt || 'text, watermark',
    style: options?.style,
    provider: provider,
    format: options?.format,
    skip_translate: options?.skip_translate,
    model: options?.model,
    size: options?.size,
    substyle: options?.substyle,
    n: options?.n
  }

  let url = ''
  console.log('provider', provider)
  url = apiBaseUrl + '/image/svg'
  switch (provider) {
    case 'claude':
      payload.provider = 'claude'
      break
    case 'recraft':
      payload.provider = 'recraft'
      break
    case 'svgio':
      payload.provider = 'svgio'
      break
    default:
      throw new Error('Invalid provider')
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Request failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  // 获取SVG内容
  const svgContent = await response.text()
  console.log('svgContent', svgContent)
  // 从响应头获取元数据
  const id = response.headers.get('X-Image-Id') || 'unknown'
  const width = parseInt('512')
  const height = parseInt('512')

  // 修改SVG内容的尺寸：大小为512*512
  const modifiedSvgContent = svgContent.replace(
    /<svg([^>]*?)>/,
    (match: string, attributes: string) => {
      // 解析现有属性
      let newAttributes = attributes
      
      // 更新或添加width属性
      if (newAttributes.includes('width=')) {
        newAttributes = newAttributes.replace(/width="[^"]*"/, `width="${width}"`)
      } else {
        newAttributes += ` width="${width}"`
      }
      
      // 更新或添加height属性
      if (newAttributes.includes('height=')) {
        newAttributes = newAttributes.replace(/height="[^"]*"/, `height="${height}"`)
      } else {
        newAttributes += ` height="${height}"`
      }
      console.log('newAttributes',newAttributes) 
      return `<svg${newAttributes}>`
    }
  )

  return {
    svgContent: modifiedSvgContent,
    id,
    width,
    height
  }
}
