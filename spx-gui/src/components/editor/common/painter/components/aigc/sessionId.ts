/**
 * SessionId 生成器
 * 确保每次生成的 ID 都是唯一的，永不重复
 */
// 计数器，用于同一毫秒内的多次调用
let counter = 0
let lastTimestamp = 0

/**
 * 生成一个唯一的 session ID
 * 策略：时间戳 + 随机数 + 计数器 + 随机字符串
 * @returns 唯一的 session ID
 */
export function generateSessionId(): string {
  // 策略1：优先使用 crypto.randomUUID()（如果可用）
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    const uuid = crypto.randomUUID()
    return uuid
  }

  // 策略2：自定义生成算法
  const timestamp = Date.now()

  // 如果在同一毫秒内多次调用，增加计数器
  if (timestamp === lastTimestamp) {
    counter++
  } else {
    counter = 0
    lastTimestamp = timestamp
  }

  // 生成随机字符串
  const randomPart = Math.random().toString(36).substring(2, 15)
  const randomPart2 = Math.random().toString(36).substring(2, 15)

  // 组合：时间戳-计数器-随机部分1-随机部分2
  const sessionId = `${timestamp}-${counter}-${randomPart}-${randomPart2}`

  return sessionId
}

// 导出默认生成器
export default generateSessionId
