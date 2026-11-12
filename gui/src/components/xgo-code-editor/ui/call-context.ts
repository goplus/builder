export type CallContext = {
  start: number
  end: number
  callee: string
  calleeStart: number
  calleeEnd: number
  /** Lexical slots, including empty slots; these are not resolved parameter indices. */
  arguments: Array<{ start: number; end: number }>
  commas: number[]
  parenthesized: boolean
}

type Token = {
  value: string
  start: number
  end: number
  kind: 'word' | 'value' | 'symbol' | 'newline' | 'comment' | 'invalid'
  pair: number | null
  parent: number | null
}

const identifierStart = /[\p{L}_]/u
const identifierPart = /[\p{L}\p{N}_]/u
const nonCall =
  /^(?:if|else|for|switch|select|case|default|func|type|import|package|var|const|return|break|continue|fallthrough|defer|go|range|map|struct|interface|repeat|on[A-Z]\w*)$/
const bodyHeader = /^(?:if|else|for|switch|select|func|repeat|on[A-Z]\w*)$/
const ignored = (token: Token) => token.kind === 'comment' || token.kind === 'newline'
const canEnd = (token: Token | null) =>
  token != null &&
  (token.kind === 'word' || token.kind === 'value' || [')', ']', '}', '++', '--'].includes(token.value))

function tokenize(source: string): Token[] {
  if (source.length > 200_000) return []
  const tokens: Token[] = []
  const stack: number[] = []
  let offset = 0
  while (offset < source.length && tokens.length < 30_000) {
    const start = offset
    const char = String.fromCodePoint(source.codePointAt(offset)!)
    if (/^[ \t\r]$/.test(char)) {
      offset += char.length
      continue
    }
    let kind: Token['kind'] = 'symbol'
    if (char === '\n') {
      offset++
      kind = 'newline'
    } else if (source.startsWith('//', offset)) {
      offset = source.indexOf('\n', offset)
      if (offset === -1) offset = source.length
      kind = 'comment'
    } else if (source.startsWith('/*', offset)) {
      const end = source.indexOf('*/', offset + 2)
      offset = end === -1 ? source.length : end + 2
      kind = end === -1 ? 'invalid' : 'comment'
    } else if (char === '"' || char === "'" || char === '`') {
      offset++
      let closed = false
      while (offset < source.length) {
        const next = source[offset++]
        if (next === char) {
          closed = true
          break
        }
        if (next === '\\' && char !== '`') offset++
        else if (next === '\n' && char !== '`') break
      }
      kind = closed ? 'value' : 'invalid'
    } else if (identifierStart.test(char)) {
      offset += char.length
      while (offset < source.length) {
        const next = String.fromCodePoint(source.codePointAt(offset)!)
        if (!identifierPart.test(next)) break
        offset += next.length
      }
      kind = 'word'
    } else if (/\d/.test(char)) {
      offset++
      while (offset < source.length && /[\w.]/.test(source[offset])) offset++
      kind = 'value'
    } else {
      const operator = /^(?:=>|:=|==|!=|<=|>=|\+\+|--|&&|\|\||\.\.\.)/.exec(source.slice(offset))?.[0]
      offset += operator?.length ?? char.length
    }
    const token: Token = {
      value: source.slice(start, offset),
      start,
      end: offset,
      kind,
      pair: null,
      parent: stack.at(-1) ?? null
    }
    const index = tokens.length
    tokens.push(token)
    if (kind === 'invalid') break
    if (kind !== 'symbol') continue
    if (['(', '[', '{'].includes(token.value)) {
      if (stack.length >= 64) return []
      stack.push(index)
    } else if ([')', ']', '}'].includes(token.value)) {
      const opening = stack.at(-1)
      const expected = token.value === ')' ? '(' : token.value === ']' ? '[' : '{'
      if (opening == null || tokens[opening].value !== expected) {
        token.kind = 'invalid'
        break
      }
      stack.pop()
      tokens[opening].pair = index
      token.pair = opening
    }
  }
  return offset < source.length && tokens.length >= 30_000 ? [] : tokens
}

function analyze(source: string) {
  const tokens = tokenize(source)
  const calls: CallContext[] = []
  const statements: CallContext[] = []
  const blocks: Array<{ start: number; end: number }> = []
  const bodies = new Set<number>()
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].value !== '{') continue
    let previous = i - 1
    while (previous >= 0 && ignored(tokens[previous])) previous--
    let first = previous
    while (first >= 0 && !['\n', '{', '}'].includes(tokens[first].value)) first--
    first++
    while (first < i && ignored(tokens[first])) first++
    if (tokens[first]?.value !== 'for') {
      for (let j = first; j < i; j++) if (tokens[j].value === ';') first = j + 1
      while (first < i && ignored(tokens[first])) first++
    }
    const parent = tokens[i].parent
    if (
      tokens[previous]?.value === '=>' ||
      ((parent == null || tokens[parent].value === '{') && bodyHeader.test(tokens[first]?.value ?? ''))
    ) {
      bodies.add(i)
      const close = tokens[i].pair
      if (close != null) blocks.push({ start: tokens[i].start, end: tokens[close].end })
    }
  }

  function calleeAt(index: number, end: number) {
    const first = tokens[index]
    if (first?.kind !== 'word' || nonCall.test(first.value) || tokens[index - 1]?.value === '.') return null
    let next = index + 1
    let callee = first.value
    let calleeEnd = first.end
    while (next + 1 < end && tokens[next].value === '.' && tokens[next + 1].kind === 'word') {
      callee += '.' + tokens[next + 1].value
      calleeEnd = tokens[next + 1].end
      next += 2
    }
    return { callee, calleeStart: first.start, calleeEnd, next }
  }

  function argumentsIn(from: number, to: number, start: number, end: number, parenthesized: boolean) {
    const arguments_: CallContext['arguments'] = []
    const commas: number[] = []
    let slotStart = start
    let first: Token | null = null
    let last: Token | null = null
    let previous: Token | null = null
    const append = (boundary: number) => {
      arguments_.push(first == null ? { start: boundary, end: boundary } : { start: first.start, end: last!.end })
      first = last = null
    }
    for (let i = from; i < to; i++) {
      const token = tokens[i]
      if (token.kind === 'invalid' || token.value === ';') return null
      if (token.kind === 'newline' || (token.kind === 'comment' && token.value.includes('\n'))) {
        if (parenthesized && canEnd(previous)) return null
        continue
      }
      if (token.kind === 'comment') continue
      if (bodies.has(i)) return null
      if (token.value === ',') {
        append(token.start)
        commas.push(token.start)
        slotStart = token.end
        previous = token
        continue
      }
      if (['(', '[', '{'].includes(token.value)) {
        if (token.pair == null || token.pair >= to) return null
        for (let j = i + 1; j < token.pair; j++) if (bodies.has(j)) return null
        first ??= token
        last = tokens[token.pair]
        previous = last
        i = token.pair
      } else {
        first ??= token
        last = previous = token
      }
    }
    if (first != null || commas.length > 0 || (!parenthesized && end > slotStart)) append(end)
    return { arguments: arguments_, commas }
  }

  function statement(from: number, to: number, boundary: number) {
    const meaningful: number[] = []
    for (let i = from; i < to; i++) if (!ignored(tokens[i])) meaningful.push(i)
    if (meaningful.length === 0) return
    const firstIndex = meaningful[0]
    const lastIndex = meaningful[meaningful.length - 1]
    if (tokens[lastIndex].kind === 'invalid') return
    let end = boundary
    for (let i = lastIndex + 1; i < to; i++)
      if (tokens[i].kind === 'comment') {
        end = tokens[i].start
        break
      }
    let root: CallContext | null = null
    for (let i = firstIndex; i <= lastIndex; i++) {
      const callee = calleeAt(i, to)
      if (callee == null || tokens[callee.next]?.value !== '(') continue
      const opening = tokens[callee.next]
      const close = opening.pair
      if (close == null || close >= to || /\n/.test(source.slice(callee.calleeEnd, opening.start))) continue
      const args = argumentsIn(callee.next + 1, close, opening.end, tokens[close].start, true)
      if (args == null) continue
      const context: CallContext = {
        start: callee.calleeStart,
        end: tokens[close].end,
        ...callee,
        ...args,
        parenthesized: true
      }
      delete (context as CallContext & { next?: number }).next
      calls.push(context)
      if (i === firstIndex && close === lastIndex) root = context
      i = callee.next
    }
    if (root != null) {
      statements.push(root)
      return
    }
    const callee = calleeAt(firstIndex, to)
    if (callee == null || tokens[callee.next]?.value === '(') return
    for (let i = callee.next; i < to; i++) {
      if (['=', ':='].includes(tokens[i].value)) return
      if (['(', '[', '{'].includes(tokens[i].value) && tokens[i].pair != null) i = tokens[i].pair!
    }
    const next = tokens[callee.next]
    if (next != null && !ignored(next) && next.value !== ',' && source.slice(callee.calleeEnd, next.start).length === 0)
      return
    if (next != null && next.kind === 'symbol' && !['+', '-', '!', '&', '*', '(', '[', '{', ','].includes(next.value))
      return
    if (next != null && ['+', '-'].includes(next.value) && tokens[callee.next + 1]?.start !== next.end) return
    const args = argumentsIn(callee.next, to, callee.calleeEnd, end, false)
    if (args == null) return
    const context: CallContext = { start: callee.calleeStart, end, ...callee, ...args, parenthesized: false }
    delete (context as CallContext & { next?: number }).next
    calls.push(context)
    statements.push(context)
  }

  function embeddedBodies(from: number, to: number) {
    for (let i = from; i < to; i++) {
      if (!bodies.has(i)) continue
      const close = tokens[i].pair
      scope(i + 1, close ?? to)
      if (close != null) i = close
    }
  }

  function scope(from: number, to: number) {
    let start = from
    let previous: Token | null = null
    for (let i = from; i < to; i++) {
      const token = tokens[i]
      if (token.kind === 'comment' && !token.value.includes('\n')) continue
      if (token.kind === 'newline' || (token.kind === 'comment' && token.value.includes('\n'))) {
        if (canEnd(previous)) {
          statement(start, i, token.start)
          start = i + 1
          previous = null
        }
        continue
      }
      if (token.value === ';') {
        statement(start, i, token.start)
        start = i + 1
        previous = null
        continue
      }
      if (token.value === ':') {
        let first = start
        while (first < i && ignored(tokens[first])) first++
        if (['case', 'default'].includes(tokens[first]?.value)) {
          statement(start, i, token.start)
          start = i + 1
          previous = null
          continue
        }
      }
      if (bodies.has(i)) {
        statement(start, i, token.start)
        const close = token.pair
        scope(i + 1, close ?? to)
        if (close == null) return
        i = close
        start = i + 1
        previous = null
      } else if (['(', '[', '{'].includes(token.value)) {
        if (token.pair == null || token.pair >= to) {
          statement(start, to, source.length)
          return
        }
        embeddedBodies(i + 1, token.pair)
        i = token.pair
        previous = tokens[i]
      } else previous = token
    }
    statement(start, to, tokens[to]?.start ?? source.length)
  }
  scope(0, tokens.length)
  return { calls, statements, blocks }
}

export function findCalls(source: string): CallContext[] {
  return analyze(source).calls
}

/** Return the owning call statement, rather than a nested argument call. Offsets use UTF-16. */
export function findCallAt(source: string, offset: number): CallContext | null {
  return analyze(source).statements.find((call) => call.start <= offset && offset <= call.end) ?? null
}

export function findEnclosingBlock(source: string, offset: number): { start: number; end: number } | null {
  return (
    analyze(source)
      .blocks.filter((block) => block.start < offset && offset < block.end)
      .sort((a, b) => a.end - a.start - (b.end - b.start))[0] ?? null
  )
}
