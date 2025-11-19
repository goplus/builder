/**
 * @desc Definition & helpers for API errors
 */

import type { LocaleMessage } from '@/utils/i18n'
import { Exception } from '@/utils/exception'
import dayjs from 'dayjs'

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
    this.meta = codeMetas[this.code as ApiExceptionCode](headers)
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

export type ApiExceptionMeta = {}
const defaultException = () => ({})
const codeMetas = {
  [ApiExceptionCode.errorQuotaExceeded]: (headers) => {
    const retryAfter = headers.get('Retry-After')
    let date
    if (retryAfter != null) {
      const seconds = Number(retryAfter)
      date = Number.isFinite(seconds) ? dayjs().add(seconds, 's') : dayjs(retryAfter)
    }
    return {
      retryAfter: date?.isValid() ? date.valueOf() : null // milliseconds or null
    }
  },
  [ApiExceptionCode.errorInvalidArgs]: defaultException,
  [ApiExceptionCode.errorUnauthorized]: defaultException,
  [ApiExceptionCode.errorForbidden]: defaultException,
  [ApiExceptionCode.errorNotFound]: defaultException,
  [ApiExceptionCode.errorTooManyRequests]: defaultException,
  [ApiExceptionCode.errorRateLimitExceeded]: defaultException,
  [ApiExceptionCode.errorUnknown]: defaultException
} satisfies Record<ApiExceptionCode, (headers: Headers) => ApiExceptionMeta>
type CodeMetas = typeof codeMetas
export type ApiExceptionMetas = { [key in keyof CodeMetas]: ReturnType<CodeMetas[key]> }

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
