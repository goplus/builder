/**
 * @desc Definition & helpers for API errors
 */

import type { LocaleMessage } from '@/utils/i18n'
import { Exception } from '@/utils/exception'

export class ApiException extends Exception {
  name = 'ApiError'
  userMessage: LocaleMessage | null

  constructor(
    public code: number,
    message: string
  ) {
    super(`[${code}] ${message}`)
    this.userMessage = codeMessages[this.code as ApiExceptionCode] ?? null
  }
}

export enum ApiExceptionCode {
  errorInvalidArgs = 40001,
  errorUnauthorized = 40100,
  errorForbidden = 40300,
  errorNotFound = 40400,
  errorQuotaExceeded = 42900,
  errorUnknown = 50000
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
  [ApiExceptionCode.errorNotFound]: {
    en: 'resource not exist',
    zh: '资源不存在'
  },
  [ApiExceptionCode.errorQuotaExceeded]: {
    en: 'quota exceeded',
    zh: '超出配额'
  },
  [ApiExceptionCode.errorUnknown]: {
    en: 'something wrong with the server',
    zh: '服务器出问题了'
  }
}
