const numericSuffixRE = /^(.*?)(\d+)$/

function splitNumericSuffix(name: string) {
  const match = name.match(numericSuffixRE)
  if (match == null) return null
  return {
    base: match[1],
    num: parseInt(match[2], 10),
    numWidth: match[2].length
  }
}

function formatNumericSuffix(base: string, num: number, numWidth: number) {
  const suffix = numWidth > 1 ? String(num).padStart(numWidth, '0') : String(num)
  return base + suffix
}

/** Return initialName or the next higher numeric-suffix variant accepted by isValid. */
export function getValidName(initialName: string, isValid: (name: string) => boolean) {
  if (initialName === '') throw new Error('name must not be blank')
  if (isValid(initialName)) return initialName

  const splitted = splitNumericSuffix(initialName)
  const base = splitted == null ? initialName : splitted.base
  const initialNum = splitted == null ? 1 : splitted.num
  const numWidth = splitted == null ? 1 : splitted.numWidth

  for (let i = initialNum + 1; ; i++) {
    const name = formatNumericSuffix(base, i, numWidth)
    if (isValid(name)) return name
    if (i - initialNum > 10000) throw new Error(`unexpected infinite loop with base ${initialName}`)
  }
}
