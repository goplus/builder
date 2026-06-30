import { describe, expect, it } from 'vitest'

import { parseAccountUserImportCsv } from './csv'

describe('parseAccountUserImportCsv', () => {
  it('parses account users from CSV', () => {
    const result = parseAccountUserImportCsv(`username,displayName,password
alice,Alice,pass123
bob,Bob,pass456
`)

    expect(result.errors).toEqual([])
    expect(result.rows).toEqual([
      { line: 2, username: 'alice', displayName: 'Alice', password: 'pass123' },
      { line: 3, username: 'bob', displayName: 'Bob', password: 'pass456' }
    ])
  })

  it('trims cells and supports quoted CSV values', () => {
    const result = parseAccountUserImportCsv(` username , displayName , password
 "alice" ,"Alice, A."," pass123 "
`)

    expect(result.errors).toEqual([])
    expect(result.rows).toEqual([{ line: 2, username: 'alice', displayName: 'Alice, A.', password: 'pass123' }])
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
alice,pass123
bob,pass456
`)

    expect(result.errors).toEqual([])
    expect(result.rows).toEqual([
      { line: 2, username: 'alice', displayName: 'alice', password: 'pass123' },
      { line: 3, username: 'bob', displayName: 'bob', password: 'pass456' }
    ])
  })

  it('validates required fields', () => {
    const result = parseAccountUserImportCsv(`username,displayName,password
,,pass123
bob,Bob,
`)

    expect(result.errors).toEqual([
      { line: 2, message: { en: 'Username is required', zh: '用户名不能为空' } },
      { line: 3, message: { en: 'Password is required', zh: '密码不能为空' } }
    ])
    expect(result.rows).toEqual([
      { line: 2, username: '', displayName: '', password: 'pass123' },
      { line: 3, username: 'bob', displayName: 'Bob', password: '' }
    ])
  })

  it('validates duplicate usernames', () => {
    const result = parseAccountUserImportCsv(`username,displayName,password
alice,Alice,pass123
alice,Alice 2,pass456
`)

    expect(result.errors).toEqual([
      { line: 3, message: { en: 'Duplicate username with line 2', zh: '用户名与第 2 行重复' } }
    ])
  })
})
