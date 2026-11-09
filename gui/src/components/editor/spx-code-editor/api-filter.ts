import type {
  CompletionContext,
  CompletionList,
  DefinitionIdentifier,
  ICompletionProvider,
  Position
} from '@/components/xgo-code-editor'

export function matchesAPI(definition: DefinitionIdentifier, whitelist: DefinitionIdentifier[]) {
  return whitelist.some(
    (allowed) =>
      allowed.package === definition.package &&
      allowed.name === definition.name &&
      (allowed.overloadId == null || allowed.overloadId === definition.overloadId)
  )
}

export class FilteredCompletionProvider implements ICompletionProvider {
  constructor(
    private provider: ICompletionProvider,
    private whitelist: DefinitionIdentifier[]
  ) {}

  async provideCompletion(ctx: CompletionContext, position: Position): Promise<CompletionList> {
    const result = await this.provider.provideCompletion(ctx, position)
    return {
      ...result,
      items: result.items.filter(
        (item) =>
          item.definition == null || item.definition.package === 'main' || matchesAPI(item.definition, this.whitelist)
      )
    }
  }
}
