import type { Token, TokenId } from '@/components/editor/code-editor/compiler'
import type { I18n } from '@/utils/i18n'
import { Project } from '@/models/project'
import { getAllTools } from '@/components/editor/code-editor/tools'

type MarkDown = string

type Doc = {
  content: MarkDown
  token: Token
}

export class DocAbility {
  private readonly i18n: I18n
  private readonly project: Project

  constructor(i18n: I18n, getProject: () => Project) {
    this.i18n = i18n
    this.project = getProject()
  }

  public getNormalDoc(tokenId: TokenId): Doc[] | null {
    const documents = getDocumentsByKeywords(tokenId.name, this.i18n, this.project)
    if (documents == null) {
      return []
    } else {
      // todo: if necessary here need `usages` prototype
      return documents.map(
        (document): Doc => ({
          content: document,
          token: {
            id: tokenId,
            usages: {
              id: '',
              insertText: '',
              effect: '',
              declaration: '',
              sample: ''
            }
          }
        })
      )
    }
  }

  public getDetailDoc(token: Token): Doc | null {
    return null
  }
}

function getDocumentsByKeywords(keyword: string, i18n: I18n, project: Project) {
  const tools = getAllTools(project)
  const tool = tools.find((s) => s.keyword === keyword)
  if (tool == null) return
  let text = i18n.t(tool.desc) + i18n.t({ en: ', e.g.', zh: '，示例：' })
  const result: string[] = []

  if (tool.usage != null) {
    text += '\n' + '```gop' + '\n' + tool.usage.sample + '\n' + '```'
    result.push(text)
  } else {
    tool
      .usages!.map((usage) => {
        const colon = i18n.t({ en: ': ', zh: '：' })
        const desc = i18n.t(usage.desc)
        return desc + colon + '\n' + '```gop' + '\n' + usage.sample + '\n' + '```'
      })
      .forEach((item) => {
        result.push(text + '\n' + item)
      })
  }
  return result
}
