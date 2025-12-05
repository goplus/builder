/**
  * A lightweight XGo language server that runs in the browser using WebAssembly.
  */
export interface XGoLanguageServer {
  /**
   * Handles incoming LSP messages from the client.
   *
   * @param message - The message to process. Any required response will be sent via the messageReplier callback.
   */
  handleMessage(message: RequestMessage | NotificationMessage): Error | null
}

declare global {
  /**
   * Creates a new instance of the XGo language server.
   *
   * @param filesProvider - Function that provides access to the workspace files. All paths in the returned Files are
   *                       relative to the workspace root. This will be called whenever the language server needs to
   *                       access the file system.
   *
   * @param messageReplier - Function called when the language server needs to reply to the client. The client should
   *                        handle these messages according to the LSP specification.
   */
  function NewXGoLanguageServer(filesProvider: () => Files, messageReplier: (message: ResponseMessage | NotificationMessage) => void): XGoLanguageServer | Error

  /**
   * Sets custom package data that will be used with higher priority than the embedded package data.
   *
   * @param data - Custom package data as a Uint8Array containing a valid pkgdata.zip file.
   */
  function SetCustomPkgdataZip(data: Uint8Array): Error | null

  /**
   * Sets the auto-imported packages for the classfile specified by id.
   *
   * @param id - The identifier of the classfile.
   * @param packages - A map where keys are package names and values are the full import paths.
   */
  function SetClassfileAutoImportedPackages(id: string, packages: Record<string, string>): Error | null
}

/**
 * A general message as defined by JSON-RPC. The language server protocol always uses “2.0” as the `jsonrpc` version.
 *
 * See https://microsoft.github.io/language-server-protocol/specifications/base/0.9/specification/#abstractMessage.
 */
export interface Message {
  jsonrpc: string
}

/**
 * A request message to describe a request between the client and the server. Every processed request must send a
 * response back to the sender of the request.
 *
 * See https://microsoft.github.io/language-server-protocol/specifications/base/0.9/specification/#requestMessage.
 */
export interface RequestMessage extends Message {
  /**
   * The request id.
   */
  id: number

  /**
   * The method to be invoked.
   */
  method: string

  /**
   * The method's params.
   */
  params?: any[] | object
}

/**
 * A Response Message sent as a result of a request. If a request doesn’t provide a result value the receiver of a
 * request still needs to return a response message to conform to the JSON-RPC specification. The result property of the
 * ResponseMessage should be set to `null` in this case to signal a successful request.
 *
 * See https://microsoft.github.io/language-server-protocol/specifications/base/0.9/specification/#responseMessage.
 */
export interface ResponseMessage extends Message {
  /**
   * The request id.
   */
  id: number

  /**
   * The result of a request. This member is REQUIRED on success.
   * This member MUST NOT exist if there was an error invoking the method.
   */
  result?: string | number | boolean | any[] | object | null

  /**
   * The error object in case a request fails.
   */
  error?: ResponseError
}

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
   * A primitive or structured value that contains additional
   * information about the error. Can be omitted.
   */
  data?: string | number | boolean | any[] | object | null
}

/**
 * A notification message. A processed notification message must not send a response back. They work like events.
 *
 * See https://microsoft.github.io/language-server-protocol/specifications/base/0.9/specification/#notificationMessage.
 */
export interface NotificationMessage extends Message {
  /**
   * The method to be invoked.
   */
  method: string

  /**
   * The notification's params.
   */
  params?: any[] | object
}

/**
  * Map from relative path to file.
  */
export type Files = {
  [path: string]: File | undefined
}

/**
 * A file in the workspace.
 */
export type File = {
  content: Uint8Array
  modTime: number // unix timestamp in milliseconds
}
