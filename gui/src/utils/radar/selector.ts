const radarIdentifierPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

export type RadarSelectorCompound = {
  name: string
  attrs: Record<string, string>
}

export class RadarSelectorSyntaxError extends SyntaxError {}

function isRadarIdentifier(value: string) {
  return radarIdentifierPattern.test(value)
}

export function parseRadarSelector(selector: string): RadarSelectorCompound[] {
  let index = 0

  function error(message: string): never {
    throw new RadarSelectorSyntaxError(`Invalid Radar selector at ${index}: ${message}`)
  }

  function skipWhitespace() {
    const start = index
    while (/\s/.test(selector[index] ?? '')) index++
    return index > start
  }

  function parseIdentifier(kind: 'name' | 'attribute name') {
    const start = index
    while (/[A-Za-z0-9-]/.test(selector[index] ?? '')) index++
    if (start === index) error(`expected ${kind}`)
    const identifier = selector.slice(start, index)
    if (!isRadarIdentifier(identifier)) error(`invalid ${kind} ${identifier}`)
    return identifier
  }

  function parseString() {
    if (selector[index] !== '"') error('expected JSON string')
    const start = index++
    let escaped = false
    while (index < selector.length) {
      const char = selector[index++]
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === '"') {
        try {
          const value = JSON.parse(selector.slice(start, index))
          if (typeof value !== 'string') error('expected JSON string')
          return value
        } catch {
          error('invalid JSON string')
        }
      }
    }
    error('unterminated JSON string')
  }

  skipWhitespace()
  if (index === selector.length) error('expected selector')

  const compounds: RadarSelectorCompound[] = []
  while (index < selector.length) {
    const name = parseIdentifier('name')
    const attrs: Record<string, string> = {}
    while (selector[index] === '[') {
      index++
      const attrName = parseIdentifier('attribute name')
      if (selector[index++] !== '=') error('expected =')
      const value = parseString()
      if (selector[index++] !== ']') error('expected ]')
      attrs[attrName] = value
    }
    compounds.push({ name, attrs })

    if (index === selector.length) break
    if (!skipWhitespace()) error(`unexpected character ${JSON.stringify(selector[index])}`)
    if (index === selector.length) break
  }
  return compounds
}
