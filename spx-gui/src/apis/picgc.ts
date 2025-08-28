/**
 * @desc Picture Generation APIs for AI image generation
 */

import { apiBaseUrl } from '@/utils/env'


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
  provider: string,//通过这个参数选择供应商:claude,recraft
  prompt: string,
  options?: {
    negative_prompt?: string
    theme?: string
    format?: string
    skip_translate?: boolean
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
    theme: options?.theme,
    provider: provider,
    format: options?.format,
    skip_translate: options?.skip_translate,
    size: options?.size,
    substyle: options?.substyle,
    n: options?.n
  }

  let url = ''
  url = apiBaseUrl + '/image/svg'

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

  return {
    svgContent:svgContent,
    id:'',
    width:512,
    height:512
  }
}
