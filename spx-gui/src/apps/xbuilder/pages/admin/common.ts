import dayjs from 'dayjs'

import type { LocaleMessage } from '@/utils/i18n'
import type { AccountAppClientType, AccountAppStatus, AccountIdentityProviderName } from '@/apis/account/common'

export const accountAppClientTypeLabels: Record<AccountAppClientType, LocaleMessage> = {
  public: { en: 'Public client', zh: '公共客户端' },
  confidential: { en: 'Confidential client', zh: '机密客户端' }
}

export const accountAppStatusLabels: Record<AccountAppStatus, LocaleMessage> = {
  active: { en: 'Active', zh: '已启用' },
  disabled: { en: 'Disabled', zh: '已停用' }
}

export const accountIdentityProviderLabels: Record<AccountIdentityProviderName, LocaleMessage> = {
  wechat: { en: 'WeChat', zh: '微信' },
  qq: { en: 'QQ', zh: 'QQ' },
  github: { en: 'GitHub', zh: 'GitHub' },
  apple: { en: 'Apple', zh: 'Apple' },
  google: { en: 'Google', zh: 'Google' },
  x: { en: 'X', zh: 'X' }
}

export const accountAdminRoles = ['accountAdmin', 'authorizationAdmin', 'assetAdmin', 'courseAdmin'] as const

export type AccountAdminRole = (typeof accountAdminRoles)[number]

export const accountAdminRoleLabels: Record<AccountAdminRole, LocaleMessage> = {
  accountAdmin: { en: 'Account admin', zh: '账号管理员' },
  authorizationAdmin: { en: 'Authorization admin', zh: '授权管理员' },
  assetAdmin: { en: 'Asset admin', zh: '素材管理员' },
  courseAdmin: { en: 'Course admin', zh: '课程管理员' }
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
