import type { LocaleMessage } from '@/utils/i18n'
import { packageSpx } from '@/utils/spx'
import {
  DefinitionKind,
  type DefinitionDocumentationItem,
  makeBasicMarkdownString,
  type DefinitionDocumentationCategory
} from '../../common'

export function defineConst(
  name: string,
  categories: DefinitionDocumentationCategory[],
  desc: LocaleMessage
): DefinitionDocumentationItem {
  return {
    categories,
    kind: DefinitionKind.Constant,
    definition: {
      package: packageSpx,
      name
    },
    insertText: name,
    overview: name,
    detail: makeBasicMarkdownString(desc)
  }
}
