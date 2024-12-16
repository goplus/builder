import type * as lsp from 'vscode-languageserver-protocol'

export interface SpxDefinitionIdentifier {
  /**
   * Full name of source package.
   * If not provided, it's assumed to be kind-statement.
   * If `main`, it's the current user package.
   * Examples:
   * - `fmt`
   * - `github.com/goplus/spx`
   * - `main`
   */
  package?: string;

  /**
   * Exported name of the definition.
   * If not provided, it's assumed to be kind-package.
   * Examples:
   * - `Println`
   * - `Sprite`
   * - `Sprite.turn`
   * - `for_statement_with_single_condition`
   */
  name?: string;

  /** Index in overloads. */
  overloadIndex?: number;
}

export namespace spxGetDefinitions {
  export const command = 'spx.getDefinitions'
  export type Arguments = lsp.TextDocumentPositionParams[]
  export type Result = SpxDefinitionIdentifier[] | null
}
