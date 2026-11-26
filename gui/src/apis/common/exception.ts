/**
 * @desc Definition & helpers for API errors
 */

import type { LocaleMessage } from '@/utils/i18n'
import { Exception } from '@/utils/exception'

export class ApiException extends Exception {
  name = 'ApiException'
  userMessage: LocaleMessage | null
  meta: unknown

  constructor(
    public code: number,
    message: string,
    { req, meta }: { req: Request; meta?: unknown }
  ) {
    super(`[${code}] ${message} (${req.method} ${req.url.slice(0, 200)})`)
    this.userMessage = codeMessages[this.code as ApiExceptionCode] ?? null
    this.meta = meta ?? null
  }
}

export class OAuthException extends Exception {
  name = 'OAuthException'
  userMessage = null

  constructor(
    public error: string,
    public errorDescription: string | null,
    public errorUri: string | null,
    { req }: { req: Request }
  ) {
    super(`[${error}] ${errorDescription ?? error} (${req.method} ${req.url.slice(0, 200)})`)
  }
}

export enum ApiExceptionCode {
  errorInvalidArgs = 40001,
  errorUnauthorized = 40100,
  errorForbidden = 40300,
  errorQuotaExceeded = 40301,
  errorNotFound = 40400,
  errorConflict = 40900,
  errorResourceMoved = 40901,
  errorContentTooLarge = 41300,
  errorUnsupportedMediaType = 41500,
  errorTooManyRequests = 42900,
  errorRateLimitExceeded = 42901,
  errorInternalServerError = 50000,
  errorScratchFeatureNotSupported = 50101
}

export type MovedResourceCanonical = {
  path: string
  username?: string
  owner?: string
  name?: string
  release?: string
}

export type RetryAfterMeta = {
  // Unix timestamp in milliseconds, or null when no valid retry time is available.
  retryAfter: number | null
}

export type QuotaExceededMeta = RetryAfterMeta

export function isQuotaExceededMeta(code: number, _meta: unknown): _meta is QuotaExceededMeta {
  return code === ApiExceptionCode.errorQuotaExceeded
}

export type TooManyRequestsMeta = RetryAfterMeta

export function isTooManyRequestsMeta(code: number, _meta: unknown): _meta is TooManyRequestsMeta {
  return code === ApiExceptionCode.errorTooManyRequests
}

const codeMessages: Record<ApiExceptionCode, LocaleMessage> = {
  [ApiExceptionCode.errorInvalidArgs]: {
    en: 'Invalid request parameters',
    zh: '请求参数无效'
  },
  [ApiExceptionCode.errorUnauthorized]: {
    en: 'Sign in to continue',
    zh: '登录后继续'
  },
  [ApiExceptionCode.errorForbidden]: {
    en: 'You don’t have permission to do this',
    zh: '你没有执行此操作的权限'
  },
  [ApiExceptionCode.errorQuotaExceeded]: {
    en: 'Usage limit reached',
    zh: '使用量已达上限'
  },
  [ApiExceptionCode.errorNotFound]: {
    en: 'Item not found',
    zh: '未找到所需内容'
  },
  [ApiExceptionCode.errorConflict]: {
    en: 'You can’t complete this action in the item’s current state',
    zh: '当前状态与此操作冲突'
  },
  [ApiExceptionCode.errorResourceMoved]: {
    en: 'This item has moved',
    zh: '所需内容已迁移'
  },
  [ApiExceptionCode.errorContentTooLarge]: {
    en: 'Content is too large',
    zh: '内容过大'
  },
  [ApiExceptionCode.errorUnsupportedMediaType]: {
    en: 'unsupported media type',
    zh: '不支持此内容类型'
  },
  [ApiExceptionCode.errorTooManyRequests]: {
    en: 'Too many requests',
    zh: '请求过于频繁'
  },
  [ApiExceptionCode.errorRateLimitExceeded]: {
    en: 'Rate limit exceeded',
    zh: '请求过于频繁'
  },
  [ApiExceptionCode.errorInternalServerError]: {
    en: 'Server error',
    zh: '服务器发生错误'
  },
  [ApiExceptionCode.errorScratchFeatureNotSupported]: {
    en: 'Some Scratch features are not supported yet',
    zh: '部分 Scratch 特性暂不支持'
  }
}
