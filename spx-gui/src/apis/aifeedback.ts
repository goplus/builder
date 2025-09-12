import { client } from './common'

// 反馈请求参数接口
export type FeedbackRequest = {
  query_id: string
  chosen_pic: number
}

// 反馈响应接口
export type FeedbackResponse = {
  status: string
  message: string
}

/**
 * 提交用户图片选择反馈（埋点功能）
 *
 * 数据流程：
 * 1. 前端调用推荐接口 `/images/recommend` 获取推荐结果和 query_id
 * 2. 用户从推荐列表中选择图片
 * 3. 前端调用此接口提交用户选择的反馈
 * 4. 后端自动调用算法服务的 `/v1/feedback/submit` 接口进行算法优化
 *
 * 注意：此函数为埋点功能，不会影响页面业务逻辑：
 * - 异步执行，不阻塞页面操作
 * - 失败时静默处理，不抛出异常
 * - 不返回结果，调用即可
 *
 * @param data 反馈数据，包含 query_id 和 chosen_pic
 */
export function submitImageFeedback(data: FeedbackRequest): void {
  // 使用 Promise.resolve().then() 确保异步执行，不阻塞调用方
  Promise.resolve().then(async () => {
    try {
      await client.post('/images/feedback', data)
      // 埋点成功，静默处理，不需要任何操作
    } catch (error) {
      // 埋点失败，静默处理，不影响业务逻辑
      // 可选：在开发环境下输出日志用于调试
      if (process.env.NODE_ENV === 'development') {
        console.warn('Image feedback submission failed:', error)
      }
    }
  })
}
