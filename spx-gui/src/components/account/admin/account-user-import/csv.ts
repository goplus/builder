import { parse } from 'csv-parse/browser/esm/sync'

export type AccountUserImportRow = {
  line: number
  username: string
  displayName: string
  password: string
}

export type AccountUserImportError = {
  line: number | null
  message: string
}

export type AccountUserImportParseResult = {
  rows: AccountUserImportRow[]
  errors: AccountUserImportError[]
}

const requiredHeaders = ['username', 'password'] as const

export function parseAccountUserImportCsv(csv: string): AccountUserImportParseResult {
  let records: string[][]
  try {
    records = parse(csv, { bom: true, skip_empty_lines: true, ltrim: true, rtrim: true })
  } catch (e) {
    return {
      rows: [],
      errors: [{ line: null, message: e instanceof Error ? e.message : 'Invalid CSV file' }]
    }
  }

  if (records.length === 0) {
    return { rows: [], errors: [{ line: null, message: 'CSV file is empty' }] }
  }

  const headers = records[0].map((header) => header.trim())
  const headerIndex = Object.fromEntries(headers.map((header, index) => [header, index]))
  const missingHeaders = requiredHeaders.filter((header) => headerIndex[header] == null)
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [{ line: 1, message: `Missing required column: ${missingHeaders.join(', ')}` }]
    }
  }

  const rows: AccountUserImportRow[] = []
  const errors: AccountUserImportError[] = []
  const usernameLines = new Map<string, number>()

  records.slice(1).forEach((record, index) => {
    const line = index + 2
    const username = readCell(record, headerIndex.username)
    const displayName = readCell(record, headerIndex.displayName) || username
    const password = readCell(record, headerIndex.password)

    if (username === '') errors.push({ line, message: 'Username is required' })
    if (displayName === '') errors.push({ line, message: 'Display name is required' })
    if (password === '') errors.push({ line, message: 'Password is required' })

    const previousLine = usernameLines.get(username)
    if (username !== '' && previousLine != null) {
      errors.push({ line, message: `Duplicate username with line ${previousLine}` })
    }
    if (username !== '') usernameLines.set(username, line)

    rows.push({ line, username, displayName, password })
  })

  if (rows.length === 0) {
    errors.push({ line: null, message: 'CSV file has no user rows' })
  }

  return { rows, errors }
}

function readCell(record: string[], index: number) {
  return (record[index] ?? '').trim()
}
