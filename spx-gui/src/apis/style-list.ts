/**
 * @desc Asking for style list
 */

import { apiBaseUrl } from '@/utils/env'

export async function getStyleList() {
  try {
    const response = await fetch(`${apiBaseUrl}/themes`)
    let data = await response.json()
    console.log('data', data)
    return data
  } catch (error) {
    console.error('Error fetching style list:', error)
    return []
  }
}


