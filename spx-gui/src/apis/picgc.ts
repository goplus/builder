/**
 * @desc Picture Generation APIs for AI image generation
 */

// independent baseUrl
const PICGC_BASE_URL = 'http://localhost:8080'

// 简单的HTTP请求函数
async function picgcRequest(path: string, options: RequestInit = {}) {
  const url = PICGC_BASE_URL + path
  
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

/** 可用的样式选项 */
export type StyleOption = 
  | 'FLAT_VECTOR'
  | 'FLAT_VECTOR_OUTLINE'
  | 'FLAT_VECTOR_SILHOUETTE'
  | 'FLAT_VECTOR_ONE_LINE_ART'
  | 'FLAT_VECTOR_LINE_ART'

/** Request payload for image generation */
export interface GenerateImageRequest {
  /** The text prompt describing the desired image */
  prompt: string
  negative_prompt?: string
  style?: StyleOption
  format?: string
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


export async function generateImage(
  prompt: string, 
  options?: {
    negative_prompt?: string
    style?: StyleOption
    format?: string
  }
): Promise<GenerateImageResponse> {
  const payload: GenerateImageRequest = {
    prompt,
    negative_prompt: options?.negative_prompt || 'text, watermark',
    style: options?.style || 'FLAT_VECTOR',
    format: options?.format
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
  prompt: string,
  options?: {
    negative_prompt?: string
    style?: StyleOption
    format?: string
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
    style: options?.style || 'FLAT_VECTOR',
    format: options?.format
  }

  const url = PICGC_BASE_URL + '/v1/images/svg'
  
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
  const width = parseInt(response.headers.get('X-Image-Width') || '512')
  const height = parseInt(response.headers.get('X-Image-Height') || '512')

  return {
    svgContent,
    id,
    width,
    height
  }
}

