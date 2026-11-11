const controlKeyword =
  /^(?:if|else|for|switch|select|case|default|func|type|import|package|var|const|return|break|continue|fallthrough|defer|go|range|map|struct|interface|on[A-Z]\w*)$/

/** Fail closed for syntax whose statement boundaries require a parser. */
export function isIndependentCommand(source: string, line: number) {
  const lines = source.split('\n')
  const text = lines[line - 1]
  if (text == null) return false
  const command = text.match(/^\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)(?:[ \t]+[A-Za-z_0-9.+-]*)?[ \t]*$/)
  if (text.trim() !== '' && (command == null || controlKeyword.test(command[1]))) return false

  const preceding = lines.slice(0, line - 1).join('\n')
  let quote: string | null = null
  let blockComment = false
  let parens = 0
  let brackets = 0
  let lastCode = ''
  for (let i = 0; i < preceding.length; i++) {
    const char = preceding[i]
    const next = preceding[i + 1]
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false
        i++
      }
      continue
    }
    if (quote != null) {
      if (char === '\\' && quote !== '`') i++
      else if (char === quote) quote = null
      continue
    }
    if (char === '/' && next === '/') {
      const end = preceding.indexOf('\n', i)
      if (end === -1) break
      i = end
      continue
    }
    if (char === '/' && next === '*') {
      blockComment = true
      i++
    } else if (char === '"' || char === "'" || char === '`') {
      quote = char
      lastCode = char
    } else {
      if (char === '(') parens++
      else if (char === ')') parens--
      else if (char === '[') brackets++
      else if (char === ']') brackets--
      if (parens < 0 || brackets < 0) return false
      if (!/\s/.test(char)) lastCode = char
    }
  }
  return quote == null && !blockComment && parens === 0 && brackets === 0 && !/[,+=*/%&|^.!?:\\-]/.test(lastCode)
}
