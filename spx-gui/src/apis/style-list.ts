/**
 * @desc Asking for style list
 */

import { apiBaseUrl } from '@/utils/env'

export async function getStyleList() {
  try {
    const response = await fetch(`${apiBaseUrl}/themes`)
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching style list:', error)
    return []
  }
}


