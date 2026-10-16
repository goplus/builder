import { packageSpx } from '@/utils/spx'
import {
  InsertTextFormat,
  type CompletionContext,
  type CompletionItem,
  type CompletionList,
  type IDocumentBase,
  type ICompletionProvider,
  type Position
} from '@/components/xgo-code-editor'

/** Keep SPX's beginner-facing completion list limited to its curated APIs. */
export class SpxCompletionProvider implements ICompletionProvider {
  constructor(
    private provider: ICompletionProvider,
    private documentBase: IDocumentBase
  ) {}

  async provideCompletion(ctx: CompletionContext, position: Position): Promise<CompletionList> {
    const result = await this.provider.provideCompletion(ctx, position)
    const visible = await Promise.all(
      result.items.map(async (item) => {
        const definition = item.definition
        return (
          definition == null ||
          definition.package !== packageSpx ||
          isKwargCompletionItem(item) ||
          (await this.documentBase.getDocumentation(definition)) != null
        )
      })
    )
    return { ...result, items: result.items.filter((_, index) => visible[index]) }
  }
}

// Kwarg snippets come from the call site and have no static API documentation entry.
function isKwargCompletionItem(item: CompletionItem) {
  return item.insertTextFormat === InsertTextFormat.Snippet && item.insertText.startsWith(`${item.label} = `)
}
