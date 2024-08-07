interface Compiler {
  // inside editor
  getInlayHints(
    codes: /* todo: change codes params type to `Code[]` */ string[]
  ): void /* change fn `getInlayHints` return type */
  getDiagnostics(
    codes: /* todo: change codes params type to `Code[]` */ string[]
  ): void /* change fn `getDiagnostics` return type */
  // completion
  getCompletionItems(
    codes: /* todo: change codes params type to `Code[]` */ string[],
    position: Position
  ): void /* change fn `getCompletionItems` return type */
  // hover
  getDefinition(
    codes: /* todo: change codes params type to `Code[]` */ string[],
    position: Position
  ): void /* change fn `getDefinition` return type */
}
