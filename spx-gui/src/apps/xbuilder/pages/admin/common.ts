import dayjs from 'dayjs'

import type { LocaleMessage } from '@/utils/i18n'

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
