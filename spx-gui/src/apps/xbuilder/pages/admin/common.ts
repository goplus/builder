import dayjs from 'dayjs'

import type { LocaleMessage } from '@/utils/i18n'
import type { AccountAppClientType, AccountAppStatus, AccountAppTokenType } from '@/apis/account/common'

export const accountAppClientTypeLabels: Record<AccountAppClientType, LocaleMessage> = {
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

export const accountAppRedirectURIsTip: LocaleMessage = {
  en: 'Where Account may redirect the user after this app completes authorization. Enter one URI per line. Values are matched exactly; production web URIs must use HTTPS.',
  zh: '本应用完成授权后，Account 可以将用户重定向到的地址。每行一个 URI，服务端进行精确匹配；生产环境 Web URI 必须使用 HTTPS。'
}

export const accountAppRedirectURIPatternsTip: LocaleMessage = {
  en: 'Read-only wildcard patterns for controlled preview or non-production callback hosts. Exact redirect URIs remain the primary allowlist. Patterns are managed outside the public Admin API and cannot be changed here.',
  zh: '用于受控预览或非生产回调域名的只读通配模式。精确回调 URI 仍是主要 allowlist；这组模式不通过公开 Admin API 管理，也不能在这里修改。'
}

export const accountAppAllowedOriginsTip: LocaleMessage = {
  en: 'Origins allowed to host Account Web and receive identity provider callbacks for this app. Enter one origin per line, such as https://account.example.com. Do not include a path, query, or fragment.',
  zh: '允许承载 Account Web 并接收本应用第三方身份提供商回调的 Origin。每行一个，例如 https://account.example.com；不要包含路径、查询参数或 fragment。'
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
