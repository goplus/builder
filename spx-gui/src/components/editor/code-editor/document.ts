import type { I18n } from '@/utils/i18n'
import type { Token, TokenWithDoc, UsageWithDoc, TokenId, TokenUsage } from './tokens/types'
import { getAllTokens } from '@/components/editor/code-editor/tokens'

export class DocAbility {
  private readonly i18n: I18n
  private readonly tokenMap = getAllTokens()

  constructor(i18n: I18n) {
    this.i18n = i18n
  }

  private getTokenMapKey(tokenId: TokenId) {
    return `${tokenId.module}/${tokenId.name}`
  }

  public async getNormalDoc(tokenId: TokenId): Promise<TokenWithDoc> {
    const token: Token | null = this.tokenMap[this.getTokenMapKey(tokenId)]
    if (!token) return { id: tokenId, usages: [] }
    const usages: UsageWithDoc[] = token.usages.map((usage) => ({ ...usage, doc: '' }))
    for (const usage of usages) {
      let content = await getUsageDocumentFromDir(token.id, usage, this.i18n)
      if (content?.includes('$picPath$')) {
        content = content.replace(
          '$picPath$',
          await getGIFFromPath(`${token.id.module}/${token.id.name}`)
        )
      }
      if (content != null) {
        usage.doc = content
      }
    }
    const doc: TokenWithDoc = { ...token, usages }
    return doc
  }

  public async getDetailDoc(tokenId: TokenId): Promise<TokenWithDoc> {
    const token: Token | null = this.tokenMap[this.getTokenMapKey(tokenId)]
    if (!token) return { id: tokenId, usages: [] }
    const usages: UsageWithDoc[] = token.usages.map((usage) => ({ ...usage, doc: '' }))
    for (const usage of usages) {
      let content = await getUsageDocumentDetailFromDir(token.id, usage, this.i18n)
      if (content?.includes('$picPath$')) {
        content = content.replace(
          '$picPath$',
          await getGIFFromPath(`${token.id.module}/${token.id.name}`)
        )
      }
      if (content != null) {
        usage.doc = content
      }
    }
    const doc: TokenWithDoc = { ...token, usages }
    return doc
  }
}

async function getUsageDocumentFromDir(
  token: TokenId,
  usage: TokenUsage,
  i18n: I18n
): Promise<string | null> {
  if (!(await checkDocumentExistence(token, i18n.lang.value))) {
    return null
  }
  if (
    await checkDocumentOverloadExistence(
      `${token.module}/${token.name}__${usage.id}`,
      i18n.lang.value
    )
  ) {
    return await readDir(`${token.module}/${token.name}__${usage.id}`, i18n.lang.value)
  } else {
    return await readDir(`${token.module}/${token.name}`, i18n.lang.value)
  }
}

async function getUsageDocumentDetailFromDir(
  token: TokenId,
  usage: TokenUsage,
  i18n: I18n
): Promise<string | null> {
  if (!(await checkDocumentExistence(token, i18n.lang.value))) {
    return null
  }
  if (await checkDocumentOverloadExistence(`${token.name}__${usage.id}`, i18n.lang.value)) {
    return await readDir(`${token.module}/${token.name}__${usage.id}_detail`, i18n.lang.value)
  } else {
    return await readDir(`${token.module}/${token.name}_detail`, i18n.lang.value)
  }
}

async function readDir(fileName: string, locale: string): Promise<string | null> {
  const markdownModules = import.meta.glob(`./docs/**/*.md`, { as: 'raw' })
  const baseUri = `./docs/${locale}/${fileName}`
  for (const path in markdownModules) {
    if (path.includes(baseUri)) {
      const module = await markdownModules[path]()
      return module
    }
  }
  return null
}

async function checkDocumentExistence(token: TokenId, locale: string): Promise<boolean> {
  const markdownModules = import.meta.glob(`./docs/**/*.md`, { as: 'raw' })

  for (const path in markdownModules) {
    if (path.includes(`/${locale}/`) && path.includes(token.name) && path.includes(token.module)) {
      return true
    }
  }
  return false
}

async function checkDocumentOverloadExistence(fileName: string, locale: string): Promise<boolean> {
  const markdownModules = import.meta.glob(`./docs/**/*.md`, { as: 'raw' })

  for (const path in markdownModules) {
    if (path.includes(`/${locale}/`) && path.includes(fileName) && path.includes('__')) {
      return true
    }
  }
  return false
}

async function getGIFFromPath(path: string): Promise<string> {
  const gifDir = import.meta.glob('./docs/gif/**/*.gif', { as: 'url' })
  for (const key in gifDir) {
    if (key.includes(path)) {
      return gifDir[key]()
    }
  }
  return ''
}
