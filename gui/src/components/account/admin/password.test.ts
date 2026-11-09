import { describe, expect, it } from 'vitest'

import * as accountAdminApis from '@/apis/admin/account'
import { validateAccountUserPassword } from './password'

describe('validateAccountUserPassword', () => {
  it('accepts printable ASCII with non-space boundaries', () => {
    for (const password of [
      'p'.repeat(8),
      'p'.repeat(128),
      '12345678',
      '1abc def2',
      '!abcdef?',
      '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'
    ]) {
      expect(validateAccountUserPassword(password)).toBeNull()
    }
  })

  it('rejects values outside the managed password policy', () => {
    for (const password of [
      '',
      'p'.repeat(7),
      'p'.repeat(129),
      ' password',
      'password ',
      '        ',
      'pass\tword',
      'pass\nword',
      'passwor\x7f',
      'password\u00e9',
      'password\u5bc6',
      'password\u{1f600}'
    ]) {
      expect(validateAccountUserPassword(password)).not.toBeNull()
    }
  })

  it('returns specific validation messages', () => {
    expect(validateAccountUserPassword('')).toEqual({ en: 'Password is required', zh: '密码不能为空' })
    expect(validateAccountUserPassword('password\u00e9')).toEqual({
      en: 'The password must contain only printable ASCII characters',
      zh: '密码只能包含可打印 ASCII 字符'
    })
    expect(validateAccountUserPassword(' password')).toEqual({
      en: 'The password cannot start or end with a space',
      zh: '密码不能以空格开头或结尾'
    })
    expect(validateAccountUserPassword('p'.repeat(accountAdminApis.accountUserPasswordMinLength - 1))).toEqual({
      en: `The password must be at least ${accountAdminApis.accountUserPasswordMinLength} characters`,
      zh: `密码长度不能少于 ${accountAdminApis.accountUserPasswordMinLength} 个字符`
    })
    expect(validateAccountUserPassword('p'.repeat(accountAdminApis.accountUserPasswordMaxLength + 1))).toEqual({
      en: `The password must be at most ${accountAdminApis.accountUserPasswordMaxLength} characters`,
      zh: `密码长度不能超过 ${accountAdminApis.accountUserPasswordMaxLength} 个字符`
    })
  })
})
