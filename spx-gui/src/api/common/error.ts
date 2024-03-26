/**
 * @desc Definition & helpers for API errors
 */

export class ApiError extends Error {
  name = 'ApiError'
  constructor(
    public code: number,
    msg: string
  ) {
    super(`[${code}] ${msg}`)
  }
}

enum ApiErrorCode {
  errorInvalidArgs = 40001,
	errorUnauthorized = 40100,
	errorForbidden = 40300,
	errorNotFound = 40400,
	errorUnknown = 50000
}

type Message = {
  en: string
  zh: string
}

const rawApiErrorMessages: Record<ApiErrorCode, Message> = {
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

const messageNamespace = 'apiError'

/** i18n messages for API error */
export const apiErrorMessages = {
  en: {
    [messageNamespace]: mapObject(rawApiErrorMessages, m => m.en)
  },
  zh: {
    [messageNamespace]: mapObject(rawApiErrorMessages, m => m.zh)
  }
}

export function getI18nKey(err: ApiError) {
  return `${messageNamespace}.${err.code}`
}

function mapObject<T extends object, K extends keyof T, V>(obj: T, mapper: (k: T[K]) => V): { [P in K]: V } {
  const result = {} as { [P in K]: V }
  Object.keys(obj).forEach((k) => {
    result[k as K] = mapper(obj[k as K])
  })
  return result
}
