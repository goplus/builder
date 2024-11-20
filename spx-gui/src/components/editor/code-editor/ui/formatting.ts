import { type BaseContext, type TextEdit } from '../common'

export type FormattingContext = BaseContext

export interface IFormattingEditProvider {
  /** Get edits for formatting single text document */
  provideDocumentFormattingEdits(ctx: FormattingContext): Promise<TextEdit[]>
}
