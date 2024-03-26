/**
 * @desc Definition & helpers for API errors
 */

import type { RawLocaleMessage } from '@/utils/i18n'
import { Exception } from '@/utils/error'

export class ApiException extends Exception {

  name = 'ApiError'
  userMessage: RawLocaleMessage | null;

  constructor(
    public code: number,
    message: string
  ) {
    super(`[${code}] ${message}`)
    this.userMessage = apiErrorMessages[this.code as ApiErrorCode] ?? null
  }
}

export enum ApiErrorCode {
  errorInvalidArgs = 40001,
  errorUnauthorized = 40100,
  errorForbidden = 40300,
  errorNotFound = 40400,
  errorUnknown = 50000
}

const apiErrorMessages: Record<ApiErrorCode, RawLocaleMessage> = {
  [ApiErrorCode.errorInvalidArgs]: {
    en: 'Invalid args',
    zh: '参数错误'
  },
  [ApiErrorCode.errorUnauthorized]: {
    en: 'You need to login first',
    zh: '请先登录'
  },
  [ApiErrorCode.errorForbidden]: {
    en: 'Permission denied',
    zh: '没有权限'
  },
  [ApiErrorCode.errorNotFound]: {
    en: 'Resource not exist',
    zh: '资源不存在'
  },
  [ApiErrorCode.errorUnknown]: {
    en: 'Something wrong with the server',
    zh: '服务器出问题了'
  }
}
