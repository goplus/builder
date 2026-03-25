/**
 * @desc This class is responsible for parsing snippets and resolving built-in variables.
 */

import { computed, shallowRef, toValue, type WatchSource } from 'vue'
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

  /** Built-in variables */
  private builtInVariables = computed<Record<string, string | null>>(() => {
    const textDocument = toValue(this.activeTextDocumentSource)
    return this.variablesProviderRef.value?.provideSnippetVariables({ textDocument }) ?? {}
  })

  private getVariableDefaultValue(variable: Variable) {
    if (variable.children.length === 0) return undefined
    const child = variable.children[0]
    if (!(child instanceof Text)) return undefined
    return child.toString()
  }

  /** Parse given snippet string & resolve built-in variables */
  parse(snippet: string) {
    const parsed = this.parser.parse(snippet)
    parsed.resolveVariables({
      resolve: (variable) => this.builtInVariables.value[variable.name] ?? this.getVariableDefaultValue(variable)
    })
    return parsed
  }
}
