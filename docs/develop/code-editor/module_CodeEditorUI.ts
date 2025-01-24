declare interface CodeEditorUI {

  registerProject(project: Project): void
  registerHoverProvider(provider: HoverProvider): void
  registerCompletionProvider(provider: CompletionProvider): void
  registerResourceReferencesProvider(provider: ResourceReferencesProvider): void
  registerContextMenuProvider(provider: ContextMenuProvider): void
  registerDiagnosticsProvider(provider: DiagnosticsProvider): void
  registerAPIReferenceProvider(provider: APIReferenceProvider): void
  registerCopilot(copilot: Copilot): void
  registerFormattingEditProvider(provider: FormattingEditProvider): void

  /** Execute a command */
  executeCommand<A extends any[], R>(command: Command<A, R>, ...input: A): Promise<R>
  /** Register a command with given name & handler */
  registerCommand<A extends any[], R>(command: Command<A, R>, info: CommandInfo<A, R>): void

  /** Open a text document in the editor. */
  open(textDocument: TextDocumentIdentifier): void
  /** Open a text document in the editor,and scroll to given position */
  open(textDocument: TextDocumentIdentifier, position: Position): void
  /** Open a text document in the editor, and select the given range */
  open(textDocument: TextDocumentIdentifier, range: IRange): void
}

// ======================== Hover ========================

interface Hover {
  contents: Documentation[]
  actions: Action[]
}

interface HoverContext extends BaseContext {}

interface HoverProvider {
  provideHover(ctx: HoverContext, position: Position): Promise<Hover | null>
}

// ======================== Completion ========================

interface CompletionContext extends BaseContext {}

type CompletionItemKind = DefinitionKind

interface CompletionItem {
  label: string
  kind: CompletionItemKind
  documentation: Documentation
}

interface CompletionProvider {
  provideCompletion(ctx: CompletionContext, position: Position): Promise<CompletionItem[]>
}

// ======================== Resource References ========================

interface ResourceReferencesContext extends BaseContext {}

interface ResourceReference {
  range: IRange
  resource: ResourceIdentifier
}

interface ResourceReferencesProvider extends Emitter<{
  didChangeResourceReferences: []
}> {
  provideResourceReferences(ctx: ResourceReferencesContext): Promise<ResourceReference[]>
}

// ======================== Context Menu ========================

interface ContextMenuContext extends BaseContext {}

interface Selection extends IRange {}

interface MenuItem {
  action: Action
}

interface ContextMenuProvider {
  provideContextMenu(ctx: ContextMenuContext, position: Position): Promise<MenuItem[]>
  provideSelectionContextMenu(ctx: ContextMenuContext, selection: Selection): Promise<MenuItem[]>
}

// ======================== Diagnostics ========================

interface DiagnosticsContext extends BaseContext {}

enum DiagnosticSeverity {
  Error,
  Warning
}

interface Diagnostic {
  range: IRange
  severity: DiagnosticSeverity
  message: string
}

interface DiagnosticsProvider extends Emitter<{
  didChangeDiagnostics: []
}> {
  provideDiagnostics(ctx: DiagnosticsContext): Promise<Diagnostic[]>
}

// ======================== API Reference ========================

interface APIReferenceItem {
  kind: DefinitionKind
  definition: DefinitionIdentifier
  insertText: string
  documentation: Documentation
}

interface APIReferenceContext extends BaseContext {}

interface APIReferenceProvider {
  provideAPIReference(ctx: APIReferenceContext, position: Position): Promise<APIReferenceItem[]>
}

// ======================== Copilot ========================

enum ChatTopicKind {
  Inspire,
  Explain,
  Review,
  FixProblem
}

interface ChatTopicInspire {
  kind: ChatTopicKind.Inspire
  question: string
}

enum ChatExplainKind {
  CodeSegment,
  SymbolWithDefinition,
}

interface ChatExplainTargetCodeSegment {
  kind: ChatExplainKind.CodeSegment
  codeSegment: CodeSegment
}

interface SymbolWithDefinition {
  range: TextDocumentRange
  definition: DefinitionIdentifier
}

interface ChatExplainTargetSymbolWithDefinition extends SymbolWithDefinition {
  kind: ChatExplainKind.SymbolWithDefinition
}

interface ChatTopicExplain {
  kind: ChatTopicKind.Explain
  target: ChatExplainTargetCodeSegment | ChatExplainTargetSymbolWithDefinition
}

interface ChatTopicReview {
  kind: ChatTopicKind.Review
  codeRange: IRange
}

interface ChatTopicFixProblem {
  kind: ChatTopicKind.FixProblem
  problem: Diagnostic
}

type ChatTopic = ChatTopicInspire | ChatTopicExplain | ChatTopicReview | ChatTopicFixProblem

enum MessageRole {
  User,
  Copilot
}

interface ChatMessage {
  role: MessageRole
  content: MarkdownString
}

interface Chat {
  topic: ChatTopic
  messages: ChatMessage[]
}

interface ChatContext extends BaseContext {}

interface Copilot {
  getChatCompletion(ctx: ChatContext, chat: Chat): Promise<ChatMessage | null>
}

// ======================== Format Editing ========================

interface FormattingContext extends BaseContext {}

interface FormattingEditProvider {
  /** Get edits for formatting single text document */
  provideDocumentFormattingEdits(ctx: FormattingContext): Promise<TextEdit[]>
}
