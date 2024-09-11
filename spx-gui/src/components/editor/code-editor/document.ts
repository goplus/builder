import type { I18n } from '@/utils/i18n'
import { Project } from '@/models/project'
import type { Token, TokenWithDoc, UsageWithDoc, TokenId, TokenUsage } from './tokens/common'

export class DocAbility {
  private readonly i18n: I18n
  private readonly project: Project

  constructor(i18n: I18n, getProject: () => Project) {
    this.i18n = i18n
    this.project = getProject()
  }

  public async getNormalDoc(token: Token): Promise<TokenWithDoc> {
    const usages: UsageWithDoc[] = token.usages.map((usage) => ({ ...usage, doc: '' }))
    for (const usage of usages) {
      const content = await getUsageDocumentFromDir(token.id, usage, this.i18n)
      if (content?.includes('$picPath$')) {
        content.replace('$picPath$', await getGIFFromPath(`${token.id.module}/${token.id.name}`))
      }
      if (content != null) {
        usage.doc = content
      }
    }
    const doc: TokenWithDoc = { ...token, usages }
    return doc
  }

  public async getDetailDoc(token: Token): Promise<TokenWithDoc> {
    const usages: UsageWithDoc[] = token.usages.map((usage) => ({ ...usage, doc: '' }))
    for (const usage of usages) {
      const content = await getUsageDocumentDetailFromDir(token.id, usage, this.i18n)
      if (content?.includes('$picPath$')) {
        content.replace('$picPath$', await getGIFFromPath(`${token.id.module}/${token.id.name}`))
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
  if (await checkDocumentOverloadExistence(`${token.name}__${usage.id}`, i18n.lang.value)) {
    return await readDir(`${token.name}__${usage.id}`, i18n.lang.value)
  } else {
    return await readDir(token.name, i18n.lang.value)
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
    return await readDir(`${token.name}__${usage.id}_detail`, i18n.lang.value)
  } else {
    return await readDir(`${token.name}_detail`, i18n.lang.value)
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

function markdownFilenameExtract(fullName: string): object {
  const obj = {
    simpleName: '',
    overload: '0',
    detail: false
  }
  const splitName = fullName.split('_')
  switch (splitName.length) {
    case 1:
      obj.simpleName = fullName
      break
    case 2:
      obj.simpleName = splitName[0]
      if (fullName.includes('detail')) {
        obj.detail = true
      } else {
        obj.overload = splitName[1]
      }
      break
    case 3:
      obj.simpleName = splitName[0]
      obj.overload = splitName[1]
      obj.detail = true
      break
  }
  return obj
}

// function getDocumentsByKeywords(keyword: string, i18n: I18n, project: Project) {
//   const tools = getAllTokens(project)
//   const tool = tools.find((s) => s.id.name === keyword)
//   if (tool == null) return
//   let text = i18n.t(tool.desc) + i18n.t({ en: ', e.g.', zh: '，示例：' })
//   const result: string[] = []

//   if (tool.usage != null) {
//     text += '\n' + '```gop' + '\n' + tool.usage.sample + '\n' + '```'
//     result.push(text)
//   } else {
//     tool
//       .usages!.map((usage) => {
//         const colon = i18n.t({ en: ': ', zh: '：' })
//         const desc = i18n.t(usage.desc)
//         return desc + colon + '\n' + '```gop' + '\n' + usage.sample + '\n' + '```'
//       })
//       .forEach((item) => {
//         result.push(text + '\n' + item)
//       })
//   }
//   return result
// }
