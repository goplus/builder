const executionMarkerPrefix = '__XB_EXEC__'

function braceDelta(line: string): number {
  let delta = 0
  let quote: '"' | "'" | '`' | null = null
  let escaped = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]
    if (quote == null && char === '/' && next === '/') break
    if (quote != null) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        quote = null
      }
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
    } else if (char === '{') {
      delta += 1
    } else if (char === '}') {
      delta -= 1
    }
  }
  return delta
}

function isTopLevelDeclaration(trimmed: string): boolean {
  // Keep declarations at the top level. In particular, fmt.Println cannot be
  // inserted before XGo functions and event handlers without changing the
  // classfile structure.
  return /^(?:func|on[A-Za-z0-9_]*|classfile|type|var|const)\b/.test(trimmed)
}

/**
 * Add source markers without placing expressions before top-level classfile declarations.
 * XGo classfiles require functions and event handlers to remain declarations at the top level.
 */
export function instrumentSpxSource(path: string, source: string): string {
  const lines = source.split(/\r?\n/)
  const hasFmtImport = lines.some((line) => /^\s*(?:import\b.*fmt|fmt\s+"fmt")/.test(line))
  let blockDepth = 0
  const instrumented: string[] = []

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    const isExecutable =
      (blockDepth > 0 || !isTopLevelDeclaration(trimmed)) &&
      trimmed !== '' &&
      !trimmed.startsWith('//') &&
      !trimmed.startsWith('/*') &&
      !trimmed.startsWith('*') &&
      !trimmed.startsWith('import ') &&
      !trimmed.startsWith('package ') &&
      trimmed !== '{' &&
      trimmed !== '}' &&
      // A top-level block header is a declaration/control-flow boundary. Its
      // body is instrumented once blockDepth is incremented below.
      !(blockDepth === 0 && trimmed.endsWith('{'))

    if (!isExecutable) {
      instrumented.push(line)
    } else {
      const indent = line.slice(0, line.length - line.trimStart().length)
      const startMarker = `${executionMarkerPrefix}start:${path}:${index + 1}`
      const endMarker = `${executionMarkerPrefix}end:${path}:${index + 1}`
      const canMarkCompletion =
        !trimmed.endsWith('{') && !trimmed.endsWith('}') && !/^(?:return|break|continue)\b/.test(trimmed)
      instrumented.push(`${indent}fmt.Println(${JSON.stringify(startMarker)})`, line)
      if (canMarkCompletion) instrumented.push(`${indent}fmt.Println(${JSON.stringify(endMarker)})`)
    }

    blockDepth = Math.max(0, blockDepth + braceDelta(line))
  })

  if (!hasFmtImport) instrumented.unshift('import "fmt"')
  return instrumented.join('\n')
}
