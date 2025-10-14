/**
 * @desc AI Image Beautify APIs for image enhancement
 */

import { toText } from '@/models/common/file'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { client } from './common'

/** Request payload for image beautification */
export interface AiBeautifyRequest {
  /** Image file (SVG or PNG) */
  image: File
  /** Positive prompt for beautification */
  positivePrompt?: string
  /** Negative prompt */
  negativePrompt?: string
  /** Strength */
  strength?: number
  /** Selected model ID */
  selectedModelId?: string
}

/** Response from backend API */
export interface AiBeautifyResponse {
  /** Unique identifier for the beautification task */
  id: string
  /** URL of the beautified image (external URL) */
  url: string
  /** Kodo storage URL */
  kodo_url: string
  /** AI resource ID */
  ai_resource_id: number
  /** SVG data content */
  svg_data: string
  /** Original prompt */
  original_prompt: string
  /** Applied prompt for beautification */
  prompt: string
  /** Style used for beautification */
  style: string
  /** Beautification strength (0-1) */
  strength: number
  /** Image width */
  width: number
  /** Image height */
  height: number
  /** Provider used (e.g., recraft) */
  provider: string
  /** Creation timestamp */
  created_at: string
}

/**
 * 验证文件是否为真实的 SVG 文件
 * @param file - 要验证的文件
 * @returns 是否为有效的 SVG 文件
 */
async function isValidSVG(file: File): Promise<boolean> {
  try {
    // 读取文件内容的前几个字节
    const text = await file.text()
    const trimmedText = text.trim()

    // 检查是否以 SVG 标签或 XML 声明开头
    const svgPattern = /^(<\?xml[^>]*\?>)?\s*<svg[\s>]/i
    return svgPattern.test(trimmedText)
  } catch {
    return false
  }
}

/**
 * 验证文件是否为真实的 PNG 文件
 * @param file - 要验证的文件
 * @returns 是否为有效的 PNG 文件
 */
async function isValidPNG(file: File): Promise<boolean> {
  try {
    // PNG 文件的魔术字节: 89 50 4E 47 0D 0A 1A 0A
    const buffer = await file.slice(0, 8).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    return (
      bytes.length === 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    )
  } catch {
    return false
  }
}

/**
 * 获取文件扩展名
 * @param filename - 文件名
 * @returns 小写的文件扩展名（不包含点）
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.substring(lastDot + 1).toLowerCase()
}

/**
 * 验证文件类型（包括扩展名和内容验证）
 * @param file - 要验证的文件
 * @returns 是否为支持的有效文件
 */
async function validateFileType(file: File): Promise<{ valid: boolean; error?: string }> {
  const extension = getFileExtension(file.name)

  // 检查文件扩展名
  if (!['svg', 'png'].includes(extension)) {
    return {
      valid: false,
      error: '文件扩展名必须是 .svg 或 .png'
    }
  }

  // 根据扩展名验证文件内容
  if (extension === 'svg') {
    const isValid = await isValidSVG(file)
    if (!isValid) {
      return {
        valid: false,
        error: '文件内容不是有效的 SVG 格式'
      }
    }
  } else if (extension === 'png') {
    const isValid = await isValidPNG(file)
    if (!isValid) {
      return {
        valid: false,
        error: '文件内容不是有效的 PNG 格式'
      }
    }
  }

  return { valid: true }
}

/**
 * 美化图像
 * @param imageFile - 图像文件
 * @param options - 美化选项
 * @returns 美化后的图像信息（包含 blob 链接和 SVG 内容）
 */
export async function beautifyImage(
  imageFile: File,
  options?: {
    positivePrompt?: string
    negativePrompt?: string
    strength?: number
    selectedModelId?: string
  }
): Promise<{
  blob: string
  svgContent: string
  id: string
  width?: number
  height?: number
}> {
  // 参数验证
  if (!imageFile) {
    throw new Error('图像文件是必需的')
  }

  // 文件大小验证 (10MB限制)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (imageFile.size > maxSize) {
    throw new Error('图像文件大小不能超过10MB')
  }

  // 文件类型验证（扩展名 + 内容验证）
  const validationResult = await validateFileType(imageFile)
  if (!validationResult.valid) {
    throw new Error(validationResult.error || '不支持的文件格式')
  }
  // 额外 MIME 验证
  if (!['image/png', 'image/svg+xml'].includes(imageFile.type)) {
    throw new Error('不支持的文件类型')
  }
  // 构建 FormData
  const formData = new FormData()
  formData.append('image', imageFile)

  formData.append(
    'prompt',
    'Refine hand-drawn sketch. Maintain original raw, imperfect style and colors.  No new elements, objects, or background. Gentle cleanup and enhancement only.' +
      (options?.positivePrompt ?? '')
  )
  formData.append('style', options?.selectedModelId ?? '')
  formData.append('negative_prompt', options?.negativePrompt ?? '')
  formData.append('strength', options?.strength ? (options.strength / 100).toString() : '0.3')

  try {
    // 发送请求到后端
    const response = await client.postFormData('/image/beautify', formData, {
      timeout: 3 * 60 * 1000 // 3分钟超时
    })

    const backendResponse = response as AiBeautifyResponse

    // const backendResponse = {
    //   id: '123',
    //   beautified_url: 'kodo://goplus-builder-usercontent-test/files/9ec7680549df56b01aa75c415fd7c8a3-5918.svg',
    //   svg_data: "1",
    //   provider: 'recraft',
    //   applied_prompt: '123',
    //   created_at: '2021-01-01'
    // }

    // 将后端返回的 URL 转换为 blob URL 和 SVG 内容
    const convertUrlToBlobUrl = async (
      imageUrl: string,
      fileName?: string
    ): Promise<{ blob: string; svgContent: string }> => {
      // 1. 创建 File 实例
      const file = createFileWithUniversalUrl(imageUrl, fileName)

      // 2. 获取SVG文本内容
      const svgContent = await toText(file)

      // 3. 创建 Blob 并生成 blob URL
      const blob = new Blob([svgContent], { type: 'image/svg+xml' })
      const blobUrl = URL.createObjectURL(blob)

      // 4. 返回包含blob和svgContent的对象
      return {
        blob: blobUrl,
        svgContent: svgContent
      }
    }

    // 转换美化后的图像 URL
    const result = await convertUrlToBlobUrl(backendResponse.kodo_url)

    return {
      blob: result.blob,
      svgContent: result.svgContent,
      id: backendResponse.id,
      width: backendResponse.width,
      height: backendResponse.height
    }
  } catch (error) {
    console.error('图像美化失败:', error)
    throw new Error('图像美化处理失败，请稍后重试')
  }
}
