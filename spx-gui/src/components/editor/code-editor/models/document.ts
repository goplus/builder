import type { Token } from '@/components/editor/code-editor/models/compiler'

enum DocEnum {}

type MarkDown = string

type Doc = {
  content: MarkDown
  type: DocEnum // normal, detail
  token: Token
}

export class DocAbility {
  getNormalDoc(token: Token): Doc | null {
    return null
  }
  getDetailDoc(token: Token): Doc | null {
    return null
  }
}
