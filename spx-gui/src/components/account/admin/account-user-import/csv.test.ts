import { describe, expect, it } from 'vitest'

import * as accountAdminApis from '@/apis/admin/account'
import { parseAccountUserImportCsv } from './csv'

describe('parseAccountUserImportCsv', () => {
  it('parses account users from CSV', () => {
    const result = parseAccountUserImportCsv(`username,displayName,password
alice,Alice,pass1234
bob,Bob,pass4567
`)

    expect(result.errors).toEqual([])
    expect(result.rows).toEqual([
      { line: 2, username: 'alice', displayName: 'Alice', password: 'pass1234' },
      { line: 3, username: 'bob', displayName: 'Bob', password: 'pass4567' }
    ])
  })

  it('trims cells and supports quoted CSV values', () => {
    const result = parseAccountUserImportCsv(` username , displayName , password
 "alice" ,"Alice, A."," pass1234 "
`)

    expect(result.errors).toEqual([])
    expect(result.rows).toEqual([{ line: 2, username: 'alice', displayName: 'Alice, A.', password: 'pass1234' }])
  })

  it('requires all required headers', () => {
    const result = parseAccountUserImportCsv(`username,displayName
alice,Alice
`)

    expect(result.rows).toEqual([])
    expect(result.errors).toEqual([
      { line: 1, message: { en: 'Missing required column: password', zh: '缺少必需列：password' } }
    ])
  })

  it('uses username as display name when display name is empty or absent', () => {
    const result = parseAccountUserImportCsv(`username,password
alice,pass1234
bob,pass4567
`)

    expect(result.errors).toEqual([])
    expect(result.rows).toEqual([
      { line: 2, username: 'alice', displayName: 'alice', password: 'pass1234' },
      { line: 3, username: 'bob', displayName: 'bob', password: 'pass4567' }
    ])
  })

  it('validates required fields', () => {
    const result = parseAccountUserImportCsv(`username,displayName,password
,,pass1234
bob,Bob,
`)

    expect(result.errors).toEqual([
      { line: 2, message: { en: 'Username is required', zh: '用户名不能为空' } },
      { line: 3, message: { en: 'Password is required', zh: '密码不能为空' } }
    ])
    expect(result.rows).toEqual([
      { line: 2, username: '', displayName: '', password: 'pass1234' },
      { line: 3, username: 'bob', displayName: 'Bob', password: '' }
    ])
  })

  it('validates field lengths', () => {
    const longUsername = 'a'.repeat(accountAdminApis.accountUserUsernameMaxLength + 1)
    const longDisplayName = 'n'.repeat(accountAdminApis.accountUserDisplayNameMaxLength + 1)
    const shortPassword = 'p'.repeat(accountAdminApis.accountUserPasswordMinLength - 1)
    const longPassword = 'p'.repeat(accountAdminApis.accountUserPasswordMaxLength + 1)

    const result = parseAccountUserImportCsv(`username,displayName,password
${longUsername},Alice,validpass
bob,${longDisplayName},validpass
carl,Carl,${shortPassword}
dave,Dave,${longPassword}
`)

    expect(result.errors).toEqual([
      {
        line: 2,
        message: {
          en: `The username is too long (maximum is ${accountAdminApis.accountUserUsernameMaxLength} characters)`,
          zh: `用户名长度超出限制（最多 ${accountAdminApis.accountUserUsernameMaxLength} 个字符）`
        }
      },
      {
        line: 3,
        message: {
          en: `The display name is too long (maximum is ${accountAdminApis.accountUserDisplayNameMaxLength} characters)`,
          zh: `显示名称长度超出限制（最多 ${accountAdminApis.accountUserDisplayNameMaxLength} 个字符）`
        }
      },
      {
        line: 4,
        message: {
          en: `The password must be at least ${accountAdminApis.accountUserPasswordMinLength} characters`,
          zh: `密码长度不能少于 ${accountAdminApis.accountUserPasswordMinLength} 个字符`
        }
      },
      {
        line: 5,
        message: {
          en: `The password is too long (maximum is ${accountAdminApis.accountUserPasswordMaxLength} characters)`,
          zh: `密码长度超出限制（最多 ${accountAdminApis.accountUserPasswordMaxLength} 个字符）`
        }
      }
    ])
  })

  it('counts Unicode code points when validating field lengths', () => {
    const displayName = '\u{1f600}'.repeat(accountAdminApis.accountUserDisplayNameMaxLength)
    const password = '\u{1f600}'.repeat(accountAdminApis.accountUserPasswordMinLength)

    const result = parseAccountUserImportCsv(`username,displayName,password
emoji,${displayName},${password}
`)

    expect(result.errors).toEqual([])
    expect(result.rows).toEqual([{ line: 2, username: 'emoji', displayName, password }])
  })

  it('validates duplicate usernames', () => {
    const result = parseAccountUserImportCsv(`username,displayName,password
alice,Alice,pass1234
alice,Alice 2,pass4567
`)

    expect(result.errors).toEqual([
      { line: 3, message: { en: 'Duplicate username with line 2', zh: '用户名与第 2 行重复' } }
    ])
  })

  it('keeps source line numbers when CSV contains empty lines', () => {
    const result = parseAccountUserImportCsv(`username,displayName,password

alice,Alice,pass1234

alice,Alice 2,pass4567
bob,Bob,
`)

    expect(result.rows).toEqual([
      { line: 3, username: 'alice', displayName: 'Alice', password: 'pass1234' },
      { line: 5, username: 'alice', displayName: 'Alice 2', password: 'pass4567' },
      { line: 6, username: 'bob', displayName: 'Bob', password: '' }
    ])
    expect(result.errors).toEqual([
      { line: 5, message: { en: 'Duplicate username with line 3', zh: '用户名与第 3 行重复' } },
      { line: 6, message: { en: 'Password is required', zh: '密码不能为空' } }
    ])
  })
})
