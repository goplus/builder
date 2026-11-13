import dayjs from 'dayjs'

import type { LocaleMessage } from '@/utils/i18n'
import type { AccountOAuthClientType, AccountAppStatus, AccountAppTokenType } from '@/apis/account/common'
import { FeedbackStatus } from '@/apis/feedback'

export const accountOAuthClientTypeLabels: Record<AccountOAuthClientType, LocaleMessage> = {
  public: { en: 'Public client', zh: '公共客户端' },
  confidential: { en: 'Confidential client', zh: '机密客户端' }
}

export const accountAppStatusLabels: Record<AccountAppStatus, LocaleMessage> = {
  active: { en: 'Active', zh: '已启用' },
  disabled: { en: 'Disabled', zh: '已停用' }
}

export const accountAppTokenTypeLabels: Record<AccountAppTokenType, LocaleMessage> = {
  accessToken: { en: 'Access token', zh: 'Access token' },
  refreshToken: { en: 'Refresh token', zh: 'Refresh token' }
}

export const accountAppOnlyScopesTip: LocaleMessage = {
  en: 'These permissions are shared by all app-only clients of this app. User read permission allows querying any account user. Removing permissions revokes affected app-only tokens without changing user authorizations.',
  zh: '权限由该应用的所有自主访问客户端共用。用户读取权限允许查询任意账号用户。移除权限会使相关自主访问令牌失效，不影响用户授权。'
}

export const accountOAuthClientRedirectURIsTip: LocaleMessage = {
  en: 'Where Account may redirect the user after authorization. Enter one URI per line. Values are matched exactly. Production web URIs must use HTTPS.',
  zh: '授权完成后，Account 可以将用户重定向到的地址。每行一个 URI，服务端进行精确匹配。生产环境 Web URI 必须使用 HTTPS。'
}

export const accountOAuthClientRedirectURIPatternsTip: LocaleMessage = {
  en: 'Read-only redirect URI patterns for platform-controlled HTTPS preview environments. Exact redirect URIs remain the primary allowlist. Patterns are managed outside the Admin API and cannot be changed here.',
  zh: '用于平台控制的 HTTPS 预览环境的只读回调 URI 模式。精确回调 URI 仍是主要白名单。这组模式不通过 Admin API 管理，也不能在这里修改。'
}

export const feedbackStatusLabels: Record<FeedbackStatus, LocaleMessage> = {
  [FeedbackStatus.New]: { en: 'Pending', zh: '待处理' },
  [FeedbackStatus.Handled]: { en: 'No reply needed', zh: '无需回复' },
  [FeedbackStatus.Replied]: { en: 'Replied', zh: '已回复' }
}

export function formatTime(value: string) {
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

export function parseLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

export function formatJSON(value: unknown) {
  return JSON.stringify(value, null, 2)
}
