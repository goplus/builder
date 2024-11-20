import {
  DefinitionKind,
  type DefinitionDocumentationItem,
  makeBasicMarkdownString,
  categoryControlFlow
} from '../common'

export const forIterate: DefinitionDocumentationItem = {
  categories: [categoryControlFlow],
  kind: DefinitionKind.Statement,
  definition: { name: 'for_iterate (TODO)' },
  insertText: 'for ${1:i}, ${2:v} <- ${3:set} {\n\t${4:}\n}',
  overview: 'for i, v <- set {} (TODO)',
  detail: makeBasicMarkdownString({ en: 'Iterate within given set', zh: '遍历指定集合' })
}
