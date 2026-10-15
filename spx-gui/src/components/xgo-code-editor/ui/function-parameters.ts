/** Read the parameter list following a language-service-resolved declaration name. */
export function readFunctionParameters(code: string, nameEnd: number) {
  let depth = 0
  let start: number | null = null
  let key = ''
  for (let i = nameEnd; i < code.length; i++) {
    const char = code[i]
    if (/\s/.test(char)) continue
    if (code.startsWith('//', i)) {
      const end = code.indexOf('\n', i + 2)
      if (end === -1) return null
      i = end
      continue
    }
    if (code.startsWith('/*', i)) {
      const end = code.indexOf('*/', i + 2)
      if (end === -1) return null
      i = end + 1
      continue
    }
    if (start == null) {
      if (char !== '(') return null
      start = i
    }
    if (char === '"' || char === "'" || char === '`') {
      const quote = char
      key += char
      let closed = false
      while (++i < code.length) {
        key += code[i]
        if (code[i] === '\\' && quote !== '`') {
          if (++i < code.length) key += code[i]
        } else if (code[i] === quote) {
          closed = true
          break
        }
      }
      if (!closed) return null
      continue
    }
    key += char
    if (char === '(') depth++
    if (char === ')' && --depth === 0) return { start, end: i + 1, key }
  }
  return null
}
