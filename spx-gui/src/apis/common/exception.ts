/**
 * @desc Definition & helpers for API errors
 */

import type { LocaleMessage } from '@/utils/i18n'
import { Exception } from '@/utils/exception'

export type ApiExceptionMeta = Record<string, unknown>

export class ApiException extends Exception {
  name = 'ApiError'
  userMessage: LocaleMessage | null
  meta: ApiExceptionMeta

  constructor(
    public code: number,
    message: string,
    headers: Headers
  ) {
    super(`[${code}] ${message}`)
    this.userMessage = codeMessages[this.code as ApiExceptionCode] ?? null
    this.meta = codeMetas[this.code as ApiExceptionCode]?.(headers) ?? {}
  }
}

export enum ApiExceptionCode {
  errorInvalidArgs = 40001,
  errorUnauthorized = 40100,
  errorForbidden = 40300,
  errorQuotaExceeded = 40301,
  errorNotFound = 40400,
  errorTooManyRequests = 42900,
  errorRateLimitExceeded = 42901,
  errorUnknown = 50000
}

const codeMetas: Record<number, (headers: Headers) => ApiExceptionMeta> = {
  [ApiExceptionCode.errorQuotaExceeded]: (headers) => {
    const retryAfter = Number(headers.get('Retry-After'))
    return {
      retryAfter: Number.isFinite(retryAfter) ? retryAfter : null
    }
  }
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
  [ApiExceptionCode.errorTooManyRequests]: {
    en: 'too many requests',
    zh: '请求太频繁了'
  },
  [ApiExceptionCode.errorRateLimitExceeded]: {
    en: 'rate limit exceeded, please retry later',
    zh: '触发频率限制，请稍后重试'
  },
  [ApiExceptionCode.errorNotFound]: {
    en: 'resource not exist',
    zh: '资源不存在'
  },
  [ApiExceptionCode.errorUnknown]: {
    en: 'something wrong with the server',
    zh: '服务器出问题了'
  }
}
