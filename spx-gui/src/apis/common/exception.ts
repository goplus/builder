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

export enum ApiExceptionCode {
  errorInvalidArgs = 40001,
  errorUnauthorized = 40100,
  errorForbidden = 40300,
  errorQuotaExceeded = 40301,
  errorNotFound = 40400,
  errorResourceMoved = 40901,
  errorTooManyRequests = 42900,
  errorRateLimitExceeded = 42901,
  errorScratchFeatureNotSupported = 50101,
  errorUnknown = 50000
}

export type MovedResourceCanonical = {
  path: string
  username?: string
  owner?: string
  name?: string
  release?: string
}

export type QuotaExceededMeta = {
  // milliseconds or null
  retryAfter: number | null
}

export function isQuotaExceededMeta(code: number, meta: unknown): meta is QuotaExceededMeta {
  return code === ApiExceptionCode.errorQuotaExceeded && meta != null
}

const codeMessages: Record<ApiExceptionCode, LocaleMessage> = {
  [ApiExceptionCode.errorInvalidArgs]: {
    en: 'invalid args',
    zh: '参数错误'
  },
  [ApiExceptionCode.errorUnauthorized]: {
    en: 'you need to login first',
    zh: '请先登录'
  },
  [ApiExceptionCode.errorForbidden]: {
    en: 'permission denied',
    zh: '没有权限'
  },
  [ApiExceptionCode.errorQuotaExceeded]: {
    en: 'quota exceeded',
    zh: '超出配额'
  },
  [ApiExceptionCode.errorNotFound]: {
    en: 'resource not exist',
    zh: '资源不存在'
  },
  [ApiExceptionCode.errorResourceMoved]: {
    en: 'resource moved',
    zh: '资源已迁移'
  },
  [ApiExceptionCode.errorTooManyRequests]: {
    en: 'too many requests',
    zh: '请求太频繁了'
  },
  [ApiExceptionCode.errorRateLimitExceeded]: {
    en: 'rate limit exceeded, please retry later',
    zh: '触发频率限制，请稍后重试'
  },
  [ApiExceptionCode.errorScratchFeatureNotSupported]: {
    en: 'Some Scratch features are not supported yet',
    zh: '部分 Scratch 特性暂不支持'
  },
  [ApiExceptionCode.errorUnknown]: {
    en: 'something wrong with the server',
    zh: '服务器出问题了'
  }
}
