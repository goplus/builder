/**
 * A lightweight XGo language server that runs in the browser using WebAssembly.
 */
export interface XGoLanguageServer {
  /**
   * Handles incoming LSP messages from the client.
   *
   * @param message - The message to process. Any required response will be sent via the `messageReplier` callback.
   */
  handleMessage(message: RequestMessage | NotificationMessage): Error | null
}

/**
 * Configuration for an XGo language server instance.
 */
export interface XGoLanguageServerOptions {
  /**
   * Classfile registrations in `gox.mod` syntax, including `project`, `class`, `import`, and `autolambda` directives.
   * An omitted or empty string selects only XGo's builtin classfiles.
   * Framework packages and their dependencies must be available in package data.
   *
   * @example
   * "project main.actor App example.com/framework\nclass -embed *.actor Item\nimport helper example.com/helper\n"
   */
  classfileConfig?: string

  /**
   * Custom package data for this server, with priority over the embedded archive.
   * The embedded archive supplies standard and XGo builtin packages. Supply framework exports and documentation here.
   * An omitted or empty `Uint8Array` uses only embedded data. The server copies the supplied bytes.
   */
  pkgDataZip?: Uint8Array
}

declare global {
  /**
   * Creates a new instance of the XGo language server.
   *
   * @param filesProvider - Function that provides access to the workspace files. All paths in the returned `Files` are
   *                       relative to the workspace root. This will be called whenever the language server needs to
   *                       access the file system.
   *
   * @param messageReplier - Function called when the language server needs to reply to the client. The client should
   *                        handle these messages according to the LSP specification.
   *
   * @param options - Instance configuration. Omitted fields use builtin classfiles and embedded package data.
   */
  function NewXGoLanguageServer(
    filesProvider: () => Files,
    messageReplier: (message: ResponseMessage | NotificationMessage) => void,
    options?: XGoLanguageServerOptions
  ): XGoLanguageServer | Error
}

/**
 * A general message as defined by JSON-RPC. LSP always uses `"2.0"` as the `jsonrpc` version.
 *
 * See https://microsoft.github.io/language-server-protocol/specifications/base/0.9/specification/#abstractMessage.
 */
export interface Message {
  jsonrpc: string
}

/**
 * A JSON-RPC message identifier.
 */
export type MessageID = number | string

/**
 * A request message sent between the client and the server. Every processed request must receive a response.
 *
 * See https://microsoft.github.io/language-server-protocol/specifications/base/0.9/specification/#requestMessage.
 */
export interface RequestMessage extends Message {
  /**
   * The request identifier.
   */
  id: MessageID

  /**
   * The method to be invoked.
   */
  method: string

  /**
   * The method's parameters.
   */
  params?: any[] | object
}

/**
 * A response message sent as a result of a request. A successful request without a result value must return `null` in
 * the `result` property.
 *
 * See https://microsoft.github.io/language-server-protocol/specifications/base/0.9/specification/#responseMessage.
 */
export interface ResponseMessage extends Message {
  /**
   * The request identifier.
   */
  id: MessageID

  /**
   * The result of a request. This property is required on success and must be absent on failure.
   */
  result?: string | number | boolean | any[] | object | null

  /**
   * The error object in case a request fails.
   */
  error?: ResponseError
}

/**
 * An error returned when a JSON-RPC request fails.
 */
export interface ResponseError {
  /**
   * A number indicating the error type that occurred.
   */
  code: number

  /**
   * A string providing a short description of the error.
   */
  message: string

  /**
   * Optional additional information about the error.
   */
  data?: string | number | boolean | any[] | object | null
}

/**
 * A notification message. The receiver must not send a response.
 *
 * See https://microsoft.github.io/language-server-protocol/specifications/base/0.9/specification/#notificationMessage.
 */
export interface NotificationMessage extends Message {
  /**
   * The method to be invoked.
   */
  method: string

  /**
   * The notification's parameters.
   */
  params?: any[] | object
}

/**
 * A map from paths relative to the workspace root to files.
 */
export type Files = {
  [path: string]: File | undefined
}

/**
 * A file in the workspace.
 */
export type File = {
  content: Uint8Array
  modTime: number // Unix timestamp in milliseconds.
}
