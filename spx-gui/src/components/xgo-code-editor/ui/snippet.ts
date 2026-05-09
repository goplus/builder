/**
 * @desc This class is responsible for parsing snippets and resolving built-in variables.
 */

import { debounce } from 'lodash'
import { watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { TaskManager } from '@/utils/task'
import { SnippetParser as BaseSnippetParser, Text, Variable } from '@/utils/snippet-parser'
import type { CodeEditorUIController } from './code-editor-ui'

export type * from '../snippet-variables'

export class SnippetParser extends Disposable {
  constructor(private ui: CodeEditorUIController) {
    super()
  }

  private parser = new BaseSnippetParser()

  private variablesMgr = new TaskManager(async (signal) => {
    const provider = this.ui.codeEditor.snippetVariablesProvider
    const textDocument = this.ui.activeTextDocument
    if (textDocument == null) return {}
    return provider.provideSnippetVariables({ textDocument, signal })
  }, true)

  private get builtInVariables() {
    return this.variablesMgr.result.data ?? {}
  }

  init() {
    const refreshVariables = debounce(() => this.variablesMgr.start(), 100)

    this.addDisposer(
      watch(
        () => this.ui.codeEditor.snippetVariablesProvider,
        () => {
          refreshVariables()
        },
        { immediate: true }
      )
    )

    this.addDisposer(
      watch(
        () => [this.ui.project.exportFiles(), this.ui.activeTextDocument],
        () => refreshVariables(),
        { immediate: true }
      )
    )
  }

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
      resolve: (variable) => this.builtInVariables[variable.name] ?? this.getVariableDefaultValue(variable)
    })
    return parsed
  }
}
