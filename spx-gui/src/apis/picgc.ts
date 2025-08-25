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

/** Request payload for image generation */
export interface GenerateImageRequest {
  /** The text prompt describing the desired image */
  prompt: string
  negative_prompt?: string
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

//todo：弃用
export async function generateImage(
  prompt: string, 
  options?: {
    negative_prompt?: string
    format?: string
  }
): Promise<GenerateImageResponse> {
  const payload: GenerateImageRequest = {
    prompt,
    negative_prompt: options?.negative_prompt || 'text, watermark',
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
  provider: string,//通过这个参数选择供应商:claude,recraft
  prompt: string,
  options?: {
    negative_prompt?: string
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
    format: options?.format
  }

  let url = ''
  switch (provider) {
    case 'claude':
      url = PICGC_BASE_URL + '/v1/images/claude/svg'
      break
    case 'recraft':
      url = PICGC_BASE_URL + '/v1/images/recraft/svg'
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
