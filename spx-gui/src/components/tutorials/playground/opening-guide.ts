export type OpeningGuideKind = 'prelude' | 'video'
export type OpeningGuideAction = 'next' | 'start'

/** Tracks the text and video steps declared in a straight-line course opening. */
export class OpeningGuide {
  private readonly steps: OpeningGuideKind[]
  private index = 0

  constructor(source: string) {
    this.steps = getOpeningSteps(source)
  }

  take(kind: OpeningGuideKind): OpeningGuideAction | null {
    if (this.steps[this.index] !== kind) {
      // A dynamic call must not consume a different step's default label.
      this.index = this.steps.length
      return null
    }
    this.index++
    return this.index < this.steps.length ? 'next' : 'start'
  }
}

function getOpeningSteps(source: string): OpeningGuideKind[] {
  // Keep literals as single tokens so text, comments and video names cannot be
  // mistaken for calls. This reads presentation order; it never executes code.
  const tokens = Array.from(
    source.matchAll(
      /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`[^`]*`|[\p{L}_][\p{L}\p{N}_]*|=>|[^\s]/gu
    ),
    ([token]) => token
  ).filter((token) => !token.startsWith('//') && !token.startsWith('/*'))
  const helpers = new Set<string>()
  tokens.forEach((token, i) => {
    if (token !== 'func') return
    if (tokens[i + 2] === '(') helpers.add(tokens[i + 1])
    if (tokens[i - 1] === '=') {
      // Assignments tokenize as name = func or name : = func.
      const nameIndex = tokens[i - 2] === ':' ? i - 3 : i - 2
      helpers.add(tokens[nameIndex])
    }
  })
  const functionCallbackPrefix = ['(', 'func', '(', ')']
  const openings: OpeningGuideKind[][] = []
  let depth = 0
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token === '{') depth++
    if (token === '}') depth--
    if (depth !== 0 || token !== 'onStart' || tokens[i - 1] === '.') continue
    let bodyStart = i + 1
    if (tokens[bodyStart] === '=>') bodyStart++
    else if (functionCallbackPrefix.every((token, offset) => tokens[bodyStart + offset] === token)) {
      bodyStart += functionCallbackPrefix.length
    } else continue
    if (tokens[bodyStart] !== '{') continue

    const steps: OpeningGuideKind[] = []
    let bodyDepth = 1
    let literalDepth = 0
    let dynamic = false
    let j = bodyStart + 1
    for (; j < tokens.length && bodyDepth > 0; j++) {
      const current = tokens[j]
      // A condition can end in an identifier too, so detect control flow
      // separately from composite literals such as SpotlightOptions{...}.
      if (['if', 'else', 'for', 'switch', 'select', 'func', '=>', 'return', 'goto', 'defer'].includes(current)) {
        dynamic = true
      }
      if (current === '{') {
        bodyDepth++
        const previous = tokens[j - 1]
        if (literalDepth > 0 || /^[\p{L}_][\p{L}\p{N}_]*$/u.test(previous) || previous === ']') literalDepth++
        else dynamic = true
      }
      if (current === '}') {
        bodyDepth--
        if (literalDepth > 0) literalDepth--
      }
      if (helpers.has(current) && tokens[j - 1] !== '.') dynamic = true
      const kind = current === 'showPrelude' ? 'prelude' : current === 'showVideo' ? 'video' : null
      if (kind != null && bodyDepth === 1 && tokens[j - 1] !== '.') steps.push(kind)
    }
    // Branches, loops, helper callbacks and parallel openings need explicit
    // author labels: their future calls cannot be predicted from source order.
    if (dynamic || bodyDepth !== 0) return []
    if (steps.length > 0) openings.push(steps)
    i = j - 1
  }
  return openings.length === 1 ? openings[0] : []
}
