import type { LocaleMessage } from '@/utils/i18n'
import { accountUserPasswordMaxLength, accountUserPasswordMinLength } from '@/apis/admin/account'

const printableASCIIPattern = /^[\x20-\x7e]+$/

export function validateAccountUserPassword(password: string): LocaleMessage | null {
  if (password === '') return { en: 'Password is required', zh: '密码不能为空' }
  if (!printableASCIIPattern.test(password))
    return {
      en: 'The password must contain only printable ASCII characters',
      zh: '密码只能包含可打印 ASCII 字符'
    }
  if (password.startsWith(' ') || password.endsWith(' '))
    return {
      en: 'The password cannot start or end with a space',
      zh: '密码不能以空格开头或结尾'
    }
  if (password.length < accountUserPasswordMinLength)
    return {
      en: `The password must be at least ${accountUserPasswordMinLength} characters`,
      zh: `密码长度不能少于 ${accountUserPasswordMinLength} 个字符`
    }
  if (password.length > accountUserPasswordMaxLength)
    return {
      en: `The password must be at most ${accountUserPasswordMaxLength} characters`,
      zh: `密码长度不能超过 ${accountUserPasswordMaxLength} 个字符`
    }
  return null
}
