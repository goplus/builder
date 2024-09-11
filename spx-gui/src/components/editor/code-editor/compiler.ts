import compilerWasmHtml from '@/assets/compiler/index.html?raw'
import compilerWasm from '@/assets/compiler/main.wasm?url'
import compilerWasmExec from '@/assets/wasm_exec.js?url'
import { Disposable } from '@/utils/disposable'
import { shallowRef } from 'vue'
import { untilNotNull } from '@/utils/utils'

export type CompilerCodes = { [k: string]: string }

interface WasmHandler extends Window {
  console: typeof console
  getInlayHints: (params: { in: { name: string; code: CompilerCodes } }) => Hint[] | {}
  getCompletionItems: (params: {
    in: { name: string; code: CompilerCodes; line: number; column: number }
  }) => CompletionItem[] | {}
  getDiagnostics: (params: { in: { name: string; code: CompilerCodes } }) => Diagnostic[] | {}
  getDefinition: (params: { in: { name: string; code: CompilerCodes } }) => Definition[] | {}
}

export interface Hint {
  startPos: number
  endPos: number
  startPosition: Position
  endPosition: Position
  name: string
  value: string
  unit: string
  type: 'play' | 'parameter'
}

export interface Position {
  Filename: string
  Offset: number
  Line: number
  Column: number
}

export type Diagnostic = {
  filename: string
  column: number
  line: number
  message: string
}

type CompletionItem = {
  label: string
  insertText: string
  type: string
  tokenName: string
  tokenPkg: string
}

type Code = {
  filename: string
  content: string
}

export interface Definition {
  // `start_pos` and `end_pos` is file offset, not compatible with monaco api `getOffset` return offset
  startPos: number
  endPos: number
  startPosition: Position
  // `end_position` is no use for it is same as `start_position` no difference
  endPosition: Position
  pkgName: string
  // `name` and `pkg_path` can transfer to `module` and `name` for type `TokenId`
  pkgPath: string
  name: string
  usages: DefinitionUsage[]
  structName: string
}

// todo: this is same as function `getTokens.TokenUsage` result, need be updated when `getTokens` is declared
export interface DefinitionUsage {
  usageID: string
  declaration: string
  sample: string
  insertText: string
  params: Array<{
    name: string
    type: string
  }>
  type: string
}

export class Compiler extends Disposable {
  containerElement?: HTMLIFrameElement
  private wasmHandlerRef = shallowRef<WasmHandler | null>()

  constructor() {
    super()
    this.addDisposer(() => this.containerElement?.removeEventListener('load', this.initIframe))
  }

  private initIframe() {
    if (!this.containerElement?.contentWindow) return
    const contentWindow = this.containerElement.contentWindow as unknown as WasmHandler
    contentWindow.document.write(
      compilerWasmHtml
        .replace('main.wasm', compilerWasm)
        .replace('../wasm_exec.js', compilerWasmExec)
    )

    contentWindow.console.log = this.handleConsoleLog.bind(this)

    this.addDisposer(() => {
      // this element is from vue ref, vue will auto remove element.
      contentWindow.location.reload()
    })
  }

  private reloadIframe() {
    // each load will emit 'load' event, after 'load', will trigger `initIframe` function
    this.containerElement?.contentWindow?.location.reload()
    this.wasmHandlerRef.value = null
  }

  private codes2CompileCode(codes: Code[]): CompilerCodes {
    const compilerCodes: Record<string, string> = {}
    codes.forEach((code) => {
      const filename = code.filename
      compilerCodes[filename] = code.content
    })
    return compilerCodes
  }

  public setContainerElement(containerElement: HTMLIFrameElement) {
    this.containerElement = containerElement
    if (containerElement.contentDocument?.readyState === 'complete') {
      // If the iframe is already loaded, call initIframe directly
      this.initIframe()
    } else {
      // If not, add the load event listener
      containerElement.addEventListener('load', this.initIframe.bind(this))
    }
  }

  public handleConsoleLog(message: any) {
    if (!message) return
    if (message.includes('goroutine ')) this.reloadIframe()
    if (message === 'WASM Init')
      this.wasmHandlerRef.value = this.containerElement?.contentWindow as
        | WasmHandler
        | null
        | undefined
  }

  private async waitForWasmInit(): Promise<WasmHandler> {
    return untilNotNull(this.wasmHandlerRef)
  }

  public async getInlayHints(currentFilename: string, codes: Code[]): Promise<Hint[]> {
    const wasmHandler = await this.waitForWasmInit()
    const inlayHints = wasmHandler.getInlayHints({
      in: {
        name: currentFilename,
        code: this.codes2CompileCode(codes)
      }
    })
    return Array.isArray(inlayHints) ? inlayHints : []
  }

  public async getDiagnostics(currentFilename: string, codes: Code[]): Promise<Diagnostic[]> {
    const wasmHandler = await this.waitForWasmInit()
    const diagnostics = wasmHandler.getDiagnostics({
      in: {
        name: currentFilename,
        code: this.codes2CompileCode(codes)
      }
    })
    return Array.isArray(diagnostics) ? diagnostics : []
  }

  public async getCompletionItems(
    currentFilename: string,
    codes: Code[],
    line: number,
    column: number
  ): Promise<CompletionItem[]> {
    const wasmHandler = await this.waitForWasmInit()
    const completionItems = wasmHandler.getCompletionItems({
      in: {
        line,
        column,
        code: this.codes2CompileCode(codes),
        name: currentFilename
      }
    })
    return Array.isArray(completionItems) ? completionItems : []
  }

  public async getDefinition(currentFilename: string, codes: Code[]): Promise<Definition[]> {
    const wasmHandler = await this.waitForWasmInit()
    const res = wasmHandler.getDefinition({
      in: {
        name: currentFilename,
        code: this.codes2CompileCode(codes)
      }
    })

    return Array.isArray(res) ? res : []
  }

  public async getTokenDetail(
    tokenName: string,
    tokenPath: string
  ): Promise</* temp return null */ null> {
    await this.waitForWasmInit()

    // implement logic here
    return null
  }
}
