// Utilities for POSIX-style paths.

/** Concatenate path components without normalizing them. */
export function join(base: string, ...paths: string[]) {
  return [base, ...paths].join('/')
}

/** Resolve path components and normalize `.` and `..` segments. */
export function resolve(base: string, ...paths: string[]) {
  const path = [base, ...paths].join('/')
  const absolute = path.startsWith('/')
  const segments: string[] = []
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (segments.length > 0 && segments[segments.length - 1] !== '..') segments.pop()
      else if (!absolute) segments.push(segment)
      continue
    }
    segments.push(segment)
  }
  return (absolute ? '/' : '') + segments.join('/')
}

/** Return the final path segment. */
export function filename(path: string) {
  const slashPos = path.lastIndexOf('/')
  return slashPos >= 0 ? path.slice(slashPos + 1) : path
}

/** Remove the final extension from the final path segment. */
export function stripExt(path: string) {
  const slashPos = path.lastIndexOf('/')
  const dotPos = path.lastIndexOf('.')
  if (dotPos > slashPos + 1) return path.slice(0, dotPos)
  return path
}

/** Return the final filename extension, including the dot. e.g. `.txt` */
export function extname(path: string) {
  return path.slice(stripExt(path).length)
}

/** Return a user-facing validation error when a value is not one POSIX-style path segment. */
export function validatePathSegment(value: string) {
  if (value === '') return { en: 'The value must not be blank', zh: '不可为空' }
  if (value === '.' || value === '..') return { en: 'The value cannot be . or ..', zh: '不可为 . 或 ..' }
  if (value.includes('/')) return { en: 'The value must not contain /', zh: '不可包含 /' }
  if (value.includes('\0')) return { en: 'The value contains an unsupported character', zh: '包含不支持的字符' }
}

/** Encode a non-empty value as one POSIX-style path segment. */
export function encodePathSegment(value: string) {
  if (value === '.') return '%2E'
  if (value === '..') return '%2E%2E'
  return value.replaceAll('%', '%25').replaceAll('/', '%2F').replaceAll('\0', '%00')
}

/** Encode a filename as one POSIX-style path segment. */
export function encodeFilename(filename: string) {
  return encodePathSegment(filename)
}
