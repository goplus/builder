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

function parenDelta(line: string): number {
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
    } else if (char === '(') {
      delta += 1
    } else if (char === ')') {
      delta -= 1
    }
  }
  return delta
}

function bracketDelta(line: string): number {
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
    } else if (char === '[') {
      delta += 1
    } else if (char === ']') {
      delta -= 1
    }
  }
  return delta
}

function codeWithoutStringsAndComments(line: string): string {
  let code = ''
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
      code += ' '
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      code += ' '
    } else {
      code += char
    }
  }
  return code
}

function continuesOnNextLine(line: string): boolean {
  const code = codeWithoutStringsAndComments(line).trimEnd()
  return /(?:\|\||&&|<<|>>|==|!=|<=|>=|:=|\+=|-=|\*=|\/=|%=|[,+\-*/%|&^=<>.])$/.test(code)
}

function isTopLevelDeclaration(trimmed: string): boolean {
  // Keep declarations at the top level. In particular, fmt.Println cannot be
  // inserted before XGo functions and event handlers without changing the
  // classfile structure.
  return /^(?:func|on[A-Za-z0-9_]*|classfile|type|var|const)\b/.test(trimmed)
}

function startsStructDeclaration(trimmed: string): boolean {
  return /^(?:type\s+.+\bstruct\b|classfile\b).*\{\s*$/.test(trimmed)
}

/**
 * Add source markers without placing expressions before top-level classfile declarations.
 * XGo classfiles require functions and event handlers to remain declarations at the top level.
 */
export function instrumentSpxSource(path: string, source: string): string {
  const lines = source.split(/\r?\n/)
  const hasFmtImport = lines.some((line) => /^\s*(?:import\b.*["']fmt["']|["']fmt["']|fmt\s+["']fmt["'])/.test(line))
  let blockDepth = 0
  let groupedDeclarationDepth = 0
  let structDeclarationDepth = 0
  let continuationParenDepth = 0
  let continuationBracketDepth = 0
  let statementContinues = false
  let pendingMarker: { indent: string; endMarker: string; startsWithExit: boolean } | null = null
  const instrumented: string[] = []

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    const startsGroupedDeclaration = groupedDeclarationDepth === 0 && /^(?:var|const|type|import)\s*\(/.test(trimmed)
    const isGroupedDeclaration = groupedDeclarationDepth > 0 || startsGroupedDeclaration
    const startsStruct = structDeclarationDepth === 0 && startsStructDeclaration(trimmed)
    const isStructDeclaration = structDeclarationDepth > 0 || startsStruct
    const isContinuationLine = statementContinues
    const isExecutable =
      !isContinuationLine &&
      !isGroupedDeclaration &&
      !isStructDeclaration &&
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
      instrumented.push(`${indent}fmt.Println(${JSON.stringify(startMarker)})`, line)
      pendingMarker = {
        indent,
        endMarker,
        startsWithExit: /^(?:return|break|continue)\b/.test(trimmed)
      }
    }

    blockDepth = Math.max(0, blockDepth + braceDelta(line))
    if (isGroupedDeclaration) {
      groupedDeclarationDepth = Math.max(0, groupedDeclarationDepth + parenDelta(line))
    }
    if (isStructDeclaration) {
      structDeclarationDepth = Math.max(0, structDeclarationDepth + braceDelta(line))
    }

    continuationParenDepth = Math.max(0, continuationParenDepth + parenDelta(line))
    continuationBracketDepth = Math.max(0, continuationBracketDepth + bracketDelta(line))
    const hasCode = codeWithoutStringsAndComments(line).trim() !== ''
    if (hasCode) {
      statementContinues = continuationParenDepth > 0 || continuationBracketDepth > 0 || continuesOnNextLine(line)
      if (!statementContinues && pendingMarker != null) {
        const canMarkCompletion = !pendingMarker.startsWithExit && !trimmed.endsWith('{') && !trimmed.endsWith('}')
        if (canMarkCompletion) {
          instrumented.push(`${pendingMarker.indent}fmt.Println(${JSON.stringify(pendingMarker.endMarker)})`)
        }
        pendingMarker = null
      }
    }
  })

  if (!hasFmtImport) instrumented.unshift('import "fmt"')
  return instrumented.join('\n')
}
