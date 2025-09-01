/**
 * @desc Asking for style list
 */

import { apiBaseUrl } from '@/utils/env'
import { createFileWithUniversalUrl } from '@/models/common/cloud'

export async function getStyleList() {
  try {
    const response = await fetch(`${apiBaseUrl}/themes`)
    const data = await response.json()

    for (const item of data) {
      const file = createFileWithUniversalUrl(item.preview_url)

      const blobUrl = await new Promise<string>((resolve, reject) => {
        let cleanup: (() => void) | null = null

        file
          .url((disposer: any) => {
            cleanup = disposer
          })
          .then((url: any) => {
            resolve(url)
          })
          .catch((error: any) => {
            reject(error)
          })

        // 设置超时
        const timeoutId = setTimeout(() => {
          cleanup?.() // 清理资源
          reject(new Error('Get preview url timeout'))
        }, 10000)

        // 成功后清除超时
        Promise.resolve().then(() => {
          clearTimeout(timeoutId)
        })
      })
      item.preview_url = blobUrl
    }

    return data
  } catch (error) {
    console.error('Error fetching style list:', error)
    return []
  }
}
