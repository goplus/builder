import * as spxTokens from './spx'
import * as gopTokens from './gop'
import type { Token } from './types'

/** return a token map, key = token.pkg_path + token.name, value = token */
export function getAllTokens() {
  const tokenMap: Record<string, Token> = {}

  const allTokens = { ...gopTokens, ...spxTokens }

  const insertToken = (token: Token) => {
    const { module, name } = token.id
    tokenMap[`${module}/${name}`] = token
  }

  Object.values(allTokens).forEach((token) => {
    if (typeof token === 'function') return
    if (Array.isArray(token)) {
      token.forEach(insertToken)
    } else {
      insertToken(token)
    }
  })

  return tokenMap
}
