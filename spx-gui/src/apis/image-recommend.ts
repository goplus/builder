/**
 * @desc Image Recommendation APIs for AI-powered image search
 */

import { toText } from '@/models/common/file'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { client } from './common'

/** 即时图片推荐请求参数 */
export interface InstantRecommendRequest {
  /** 项目ID */
  project_id: number
  /** 用户输入的提示词 */
  user_prompt: string
  /** 返回结果数量，默认4，范围1-50 */
  top_k?: number
  /** 图片主题风格 */
  theme?: 'cartoon' | 'realistic' | 'minimal' | 'nature' | ''
}

/** 组件使用的图片结果接口 */
export interface ImageResult {
  id: number
  title: string
  thumbnail: string
  url: string
  similarity: number
  rank: number
  source: 'search' | 'generated'
}

/**
 * 基于项目上下文的即时图片推荐 - 返回SVG内容数组（与picgc.ts保持一致）
 */
export async function instantImageRecommend(
  projectId: number,
  userPrompt: string,
  options?: {
    top_k?: number
    theme?: 'cartoon' | 'realistic' | 'minimal' | 'nature' | ''
  }
): Promise<{
  svgContents: { blob: string; svgContent: string }[]
  query: string
  results_count: number
}> {
  const payload: InstantRecommendRequest = {
    project_id: projectId,
    user_prompt: userPrompt,
    top_k: options?.top_k || 4,
    theme: options?.theme || ''
  }

  // 获取后端返回的原始数据
  const backendResponse = await client.post('/images/instant/recommend', payload, { timeout: 3 * 60 * 1000 })

  // 将后端response整理成所需的数组格式
  const imageUrls = backendResponse.results.map((result: any) => result.image_path)

  // 使用统一的图片处理函数
  const svgContents = await processImageUrls(imageUrls)

  return {
    svgContents: svgContents,
    query: backendResponse.query,
    results_count: backendResponse.results_count
  }
}

/**
 * 将新API响应转换为组件需要的格式
 */
export function transformToImageResults(
  response: { svgContents: { blob: string; svgContent: string }[] },
  keywords: string
): ImageResult[] {
  return response.svgContents.map((item, index) => ({
    id: index + 1,
    title: `${keywords} - 搜索结果 ${index + 1}`,
    thumbnail: item.blob, // 使用处理后的blob URL
    url: item.blob, // 使用处理后的blob URL
    similarity: 1.0, // 默认相似度
    rank: index + 1,
    source: 'search' as const
  }))
}

/**
 * 将Kodo URL转换为blob URL的通用函数
 */
export async function convertKodoUrlToBlobUrl(
  kodoUrl: string,
  fileName?: string
): Promise<{ blob: string; svgContent: string }> {
  // 1. 创建 File 实例
  const file = createFileWithUniversalUrl(kodoUrl, fileName)

  // 2. 获取SVG文本内容
  const svgContent = await toText(file)
  const blob = new Blob([svgContent], { type: 'image/svg+xml' })
  const blobUrl = URL.createObjectURL(blob)

  // 3. 获取 blob URL
  // const blobUrl = await new Promise<string>((resolve, reject) => {
  //   let cleanup: (() => void) | null = null

  //   file
  //     .url((disposer) => {
  //       cleanup = disposer
  //     })
  //     .then((url) => {
  //       resolve(url)
  //     })
  //     .catch((error) => {
  //       reject(error)
  //     })

  //   // 设置超时
  //   const timeoutId = setTimeout(() => {
  //     // cleanup?.() // 清理资源
  //     reject(new Error('获取 blob URL 超时'))
  //   }, 10000)

  //   // 成功后清除超时
  //   Promise.resolve().then(() => {
  //     clearTimeout(timeoutId)
  //   })
  // })

  // 4. 返回包含blob和svgContent的对象
  return {
    blob: blobUrl,
    svgContent: svgContent
  }
}

/**
 * 处理图片URL数组，转换为blob URL格式
 */
export async function processImageUrls(imageUrls: string[]): Promise<{ blob: string; svgContent: string }[]> {
  const svgContents: { blob: string; svgContent: string }[] = []

  for (let index = 0; index < imageUrls.length; index++) {
    const kodoUrl = imageUrls[index]
    const result = await convertKodoUrlToBlobUrl(kodoUrl)
    svgContents.push({
      blob: result.blob,
      svgContent: result.svgContent
    })
  }

  return svgContents
}

/**
 * 处理Mock数据并转换为组件需要的格式
 */
export async function processMockData(mockData: {
  query: string
  results_count: number
  results: Array<{
    id: number
    image_path: string
    similarity: number
    rank: number
    source: 'search' | 'generated'
  }>
}): Promise<{
  svgContents: { blob: string; svgContent: string }[]
  query: string
  results_count: number
}> {
  // 提取图片URL
  const imageUrls = mockData.results.map((result) => result.image_path)

  // 处理图片URL
  const svgContents = await processImageUrls(imageUrls)

  return {
    svgContents: svgContents,
    query: mockData.query,
    results_count: mockData.results_count
  }
}
