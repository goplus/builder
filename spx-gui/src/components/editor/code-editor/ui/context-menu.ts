import { shallowRef } from 'vue'
import { Disposable } from '@/utils/disposable'
import { type Action, type BaseContext, type Selection, type Position, type CodeSegment } from '../common'
import { ChatExplainKind, ChatTopicKind, type CodeEditorUI } from '.'

export type ContextMenuContext = BaseContext

export type MenuItem = {
  action: Action
}

export interface IContextMenuProvider {
  provideContextMenu(ctx: ContextMenuContext, position: Position): Promise<MenuItem[]>
  provideSelectionContextMenu(ctx: ContextMenuContext, selection: Selection): Promise<MenuItem[]>
}

export class ContextMenuController extends Disposable {
  private providerRef = shallowRef<IContextMenuProvider | null>(null)
  registerProvider(provider: IContextMenuProvider) {
    this.providerRef.value = provider
  }

  constructor(private ui: CodeEditorUI) {
    super()
  }

  init() {
    const { editor } = this.ui

    // TODO: get actions from provider
    this.addDisposable(
      editor.addAction({
        id: 'spx.copilot.explain',
        label: 'Explain',
        contextMenuGroupId: 'copilot',
        run: () => {
          const { activeTextDocument: textModel, cursorPosition: position } = this.ui
          if (textModel == null || position == null) return
          let codeSegment: CodeSegment
          const selection = editor.getSelection()
          if (selection == null || selection.isEmpty()) {
            const word = textModel.getWordAtPosition(position)
            if (word == null) return
            codeSegment = {
              textDocument: textModel.id,
              range: {
                start: {
                  line: position.line,
                  column: word.startColumn
                },
                end: {
                  line: position.line,
                  column: word.endColumn
                }
              },
              content: word.word
            }
          } else {
            codeSegment = {
              textDocument: textModel.id,
              range: {
                start: {
                  line: selection.startLineNumber,
                  column: selection.startColumn
                },
                end: {
                  line: selection.endLineNumber,
                  column: selection.endColumn
                }
              },
              content: textModel.getValueInRange({
                start: {
                  line: selection.startLineNumber,
                  column: selection.startColumn
                },
                end: {
                  line: selection.endLineNumber,
                  column: selection.endColumn
                }
              })
            }
          }
          this.ui.copilotController.startChat({
            kind: ChatTopicKind.Explain,
            target: {
              kind: ChatExplainKind.CodeSegment,
              codeSegment
            }
          })
        }
      })
    )

    this.addDisposable(
      editor.addAction({
        id: 'spx.copilot.review',
        label: 'Review',
        contextMenuGroupId: 'copilot',
        run: () => {
          const { activeTextDocument: textModel, cursorPosition: position } = this.ui
          if (textModel == null || position == null) return
          const selection = editor.getSelection()
          if (selection == null || selection.isEmpty()) return
          this.ui.copilotController.startChat({
            kind: ChatTopicKind.Review,
            range: {
              start: {
                line: selection.startLineNumber,
                column: selection.startColumn
              },
              end: {
                line: selection.endLineNumber,
                column: selection.endColumn
              }
            },
            textDocument: textModel.id,
            code: textModel.getValueInRange({
              start: {
                line: selection.startLineNumber,
                column: selection.startColumn
              },
              end: {
                line: selection.endLineNumber,
                column: selection.endColumn
              }
            })
          })
        }
      })
    )
  }
}
