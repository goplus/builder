/**
 * @desc This class is responsible for parsing snippets and resolving built-in variables.
 */

import { shallowRef, toValue, type WatchSource } from 'vue'
import { SnippetParser as BaseSnippetParser, Text, Variable } from '@/utils/snippet-parser'
import type { ITextDocument } from '../common'
import type { ISnippetVariablesProvider } from '../snippet-variables'

export type * from '../snippet-variables'

export class SnippetParser {
  constructor(private activeTextDocumentSource: WatchSource<ITextDocument | null>) {}

  private parser = new BaseSnippetParser()

  private variablesProviderRef = shallowRef<ISnippetVariablesProvider | null>(null)
  registerVariablesProvider(provider: ISnippetVariablesProvider) {
    this.variablesProviderRef.value = provider
  }

  private getVariableDefaultValue(variable: Variable) {
    if (variable.children.length === 0) return undefined
    const child = variable.children[0]
    if (!(child instanceof Text)) return undefined
    return child.toString()
  }

  /** Parse given snippet string & resolve built-in variables */
  async parse(snippet: string, signal?: AbortSignal) {
    const parsed = this.parser.parse(snippet)
    const textDocument = toValue(this.activeTextDocumentSource)

    const requestedVariables = new Set<string>()
    parsed.walk((marker) => {
      if (marker instanceof Variable && marker.name !== '') requestedVariables.add(marker.name)
      return true
    })

    const builtInVariables = await this.variablesProviderRef.value?.provideSnippetVariables(
      { textDocument },
      [...requestedVariables],
      signal
    )
    parsed.resolveVariables({
      resolve: (variable) => builtInVariables?.[variable.name] ?? this.getVariableDefaultValue(variable)
    })
    return parsed
  }
}
