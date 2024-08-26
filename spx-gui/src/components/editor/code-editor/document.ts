import type { Token } from '@/components/editor/code-editor/compiler'
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

  public getNormalDoc(token: Token): Doc | null {
    return {
      content: getDocumentByKeywords(token.name, this.i18n, this.project) || '',
      token
    }
  }
  public getDetailDoc(token: Token): Doc | null {
    return null
  }
}

function getDocumentByKeywords(keyword: string, i18n: I18n, project: Project) {
  const tools = getAllTools(project)
  const tool = tools.find((s) => s.keyword === keyword)
  if (tool == null) return
  let text = i18n.t(tool.desc) + i18n.t({ en: ', e.g.', zh: '，示例：' })
  if (tool.usage != null) {
    text += ` 
\`\`\`gop
${tool.usage.sample}
\`\`\``
  } else {
    text = [
      text,
      ...tool.usages!.map((usage) => {
        const colon = i18n.t({ en: ': ', zh: '：' })
        const desc = i18n.t(usage.desc)
        return `* ${desc}${colon}
\`\`\`gop
${usage.sample}
\`\`\``
      })
    ].join('\n')
  }
  return text
}
