const numericSuffixRE = /^(.*?)(\d+)$/

/** Upper bound on candidates tried, so a predicate that never accepts cannot hang the caller. */
const maxAttempts = 10000

function splitNumericSuffix(name: string) {
  const match = name.match(numericSuffixRE)
  if (match == null) return null
  return { base: match[1], digits: match[2] }
}

/**
 * Add one to a non-negative decimal integer given as its digits. Working on the digits rather than on a `Number`
 * keeps every suffix exact: past `Number.MAX_SAFE_INTEGER`, `n + 1 === n` and incrementing a number stalls.
 */
function incrementDecimal(digits: string) {
  const chars = digits.split('')
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i] !== '9') {
      chars[i] = String(Number(chars[i]) + 1)
      return chars.join('')
    }
    chars[i] = '0'
  }
  return '1' + chars.join('')
}

/** Return initialName or the next higher numeric-suffix variant accepted by isValid. */
export function getValidName(initialName: string, isValid: (name: string) => boolean) {
  if (initialName === '') throw new Error('name must not be blank')
  if (isValid(initialName)) return initialName

  const splitted = splitNumericSuffix(initialName)
  const base = splitted == null ? initialName : splitted.base
  // A name without a numeric suffix continues from `base2`, as if it had been `base1`.
  let digits = splitted == null ? '1' : splitted.digits
  // Keep the suffix at least as wide as the original one, so `video02` is followed by `video03`.
  const width = digits.length

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    digits = incrementDecimal(digits)
    const name = base + digits.padStart(width, '0')
    if (isValid(name)) return name
  }
  throw new Error(`no valid name found after ${maxAttempts} attempts from ${initialName}`)
}
