import { z } from 'zod'

// If <thinking> enabled, consider to add hints in system prompt like:
// 2. Do brief analysis (in the current UI language) within <thinking></thinking> tags about what the user is trying to accomplish, what information is needed, and what tools can be used to get related information.

export const tagName = 'thinking'
export const description = 'Custom element to wrap your thinking process.'
export const attributes = z.object({})
export const isRaw = true

export default {
  render() {
    return null // This is a placeholder for thinking process, no actual rendering
  }
}
