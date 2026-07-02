import { parse, type InfoRecord } from 'csv-parse/browser/esm/sync'

import type { LocaleMessage } from '@/utils/i18n'
import { getStringLengthInCodePoints } from '@/utils/utils'
import * as accountAdminApis from '@/apis/admin/account'

export type AccountUserImportRow = {
  line: number
  username: string
  displayName: string
  password: string
}

export type AccountUserImportError = {
  line: number | null
  message: LocaleMessage
}

export type AccountUserImportParseResult = {
  rows: AccountUserImportRow[]
  errors: AccountUserImportError[]
}

type ParsedRecord = {
  record: string[]
  info: InfoRecord
}

const requiredHeaders = ['username', 'password'] as const
export const accountUserImportExampleCsv = 'username,displayName,password\nsample-user,Sample User,YOUR_PASSWORD_HERE\n'

export function parseAccountUserImportCsv(csv: string): AccountUserImportParseResult {
  let records: ParsedRecord[]
  try {
    records = parse(csv, {
      bom: true,
      skip_empty_lines: true,
      ltrim: true,
      rtrim: true,
      info: true
    }) as unknown as ParsedRecord[]
  } catch (e) {
    return {
      rows: [],
      errors: [
        { line: null, message: { en: e instanceof Error ? e.message : 'Invalid CSV file', zh: 'CSV 文件格式错误' } }
      ]
    }
  }

  if (records.length === 0) {
    return { rows: [], errors: [{ line: null, message: { en: 'CSV file is empty', zh: 'CSV 文件为空' } }] }
  }

  const headerRecord = records[0]
  const headers = headerRecord.record.map((header) => header.trim())
  const headerIndex = Object.fromEntries(headers.map((header, index) => [header, index]))
  const missingHeaders = requiredHeaders.filter((header) => headerIndex[header] == null)
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [
        {
          line: headerRecord.info.lines,
          message: {
            en: `Missing required column: ${missingHeaders.join(', ')}`,
            zh: `缺少必需列：${missingHeaders.join(', ')}`
          }
        }
      ]
    }
  }

  const rows: AccountUserImportRow[] = []
  const errors: AccountUserImportError[] = []
  const usernameLines = new Map<string, number>()

  records.slice(1).forEach(({ record, info }) => {
    const line = info.lines
    const username = readCell(record, headerIndex.username)
    const displayName = readCell(record, headerIndex.displayName) || username
    const password = readCell(record, headerIndex.password)
    const usernameLength = getStringLengthInCodePoints(username)
    const displayNameLength = getStringLengthInCodePoints(displayName)
    const passwordLength = getStringLengthInCodePoints(password)

    if (username === '') errors.push({ line, message: { en: 'Username is required', zh: '用户名不能为空' } })
    else if (usernameLength > accountAdminApis.accountUserUsernameMaxLength) {
      errors.push({
        line,
        message: {
          en: `The username is too long (maximum is ${accountAdminApis.accountUserUsernameMaxLength} characters)`,
          zh: `用户名长度超出限制（最多 ${accountAdminApis.accountUserUsernameMaxLength} 个字符）`
        }
      })
    }
    if (displayNameLength > accountAdminApis.accountUserDisplayNameMaxLength) {
      errors.push({
        line,
        message: {
          en: `The display name is too long (maximum is ${accountAdminApis.accountUserDisplayNameMaxLength} characters)`,
          zh: `显示名称长度超出限制（最多 ${accountAdminApis.accountUserDisplayNameMaxLength} 个字符）`
        }
      })
    }
    if (password === '') errors.push({ line, message: { en: 'Password is required', zh: '密码不能为空' } })
    else if (passwordLength < accountAdminApis.accountUserPasswordMinLength) {
      errors.push({
        line,
        message: {
          en: `The password must be at least ${accountAdminApis.accountUserPasswordMinLength} characters`,
          zh: `密码长度不能少于 ${accountAdminApis.accountUserPasswordMinLength} 个字符`
        }
      })
    } else if (passwordLength > accountAdminApis.accountUserPasswordMaxLength) {
      errors.push({
        line,
        message: {
          en: `The password is too long (maximum is ${accountAdminApis.accountUserPasswordMaxLength} characters)`,
          zh: `密码长度超出限制（最多 ${accountAdminApis.accountUserPasswordMaxLength} 个字符）`
        }
      })
    }

    const previousLine = usernameLines.get(username)
    if (username !== '' && previousLine != null) {
      errors.push({
        line,
        message: {
          en: `Duplicate username with line ${previousLine}`,
          zh: `用户名与第 ${previousLine} 行重复`
        }
      })
    }
    if (username !== '') usernameLines.set(username, line)

    rows.push({ line, username, displayName, password })
  })

  if (rows.length === 0) {
    errors.push({ line: null, message: { en: 'CSV file has no user rows', zh: 'CSV 文件没有用户行' } })
  }

  return { rows, errors }
}

function readCell(record: string[], index: number | undefined) {
  if (index == null) return ''
  return (record[index] ?? '').trim()
}
