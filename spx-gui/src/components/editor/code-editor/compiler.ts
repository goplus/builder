// todo: refactor this into webWorker

import compilerWasmHtml from '@/assets/compiler/index.html?raw'
import compilerWasm from '@/assets/compiler/main.wasm?url'
import compilerWasmExec from '@/assets/wasm_exec.js?url'
import { Disposable } from '@/utils/disposable'
import { shallowRef } from 'vue'
import { untilNotNull } from '@/utils/utils'
import type { TokenId } from '@/components/editor/code-editor/tokens/types'

export type CompilerCodes = Record<string, string>

interface WasmHandler extends Window {
  console: typeof console
  getInlayHints: (params: { in: { name: string; code: CompilerCodes } }) => Hint[]
  getCompletionItems: (params: {
    in: { name: string; code: CompilerCodes; line: number; column: number }
  }) => CompletionItem[]
  getDiagnostics: (params: { in: { name: string; code: CompilerCodes } }) => Diagnostic[]
  getDefinition: (params: { in: { name: string; code: CompilerCodes } }) => Definition[]
  getTokenDetail: (params: { in: { name: string; pkgPath: string } }) => TokenDetail
  getTokensDetail: (params: {
    in: { tokens: Array<{ name: string; pkgPath: string }> }
  }) => TokenDetail[]
}

export interface Hint {
  startPos: number
  endPos: number
  startPosition: TokenPosition
  endPosition: TokenPosition
  name: string
  value: string
  unit: string
  type: 'play' | 'parameter'
}

export interface Diagnostic {
  filename: string
  column: number
  line: number
  message: string
}

interface CompletionItem {
  label: string
  insertText: string
  type: string
  tokenName: string
  tokenPkg: string
}

interface Code {
  filename: string
  content: string
}

export interface TokenPosition {
  filename: string
  offset: number
  line: number
  column: number
}

interface TokenSourcePosition {
  startPos: number
  endPos: number
  startPosition: TokenPosition
  endPosition: TokenPosition
}

export interface Definition extends TokenSourcePosition, TokenDetail {
  // if in 'main.spx' defined a func name 'sayHi', user use this in 'SpriteA.spx', this property 'from' will lead to 'main.spx' and which column and line it is.
  from: TokenSourcePosition
}

export interface TokenDetail {
  pkgName: string
  // `name` and `pkgPath` can transfer to type `TokenId`
  pkgPath: string
  name: string
  usages: TokenUsage[]
  structName: string
}

export interface TokenUsage {
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
    // fixme: fix when wasm crashed and reload not working
    this.wasmHandlerRef.value = null
    this.containerElement?.contentWindow?.location.reload()
  }

  private codes2CompileCode(codes: Code[]): CompilerCodes {
    return codes.reduce((compilerCodes: CompilerCodes, code) => {
      const filename = code.filename
      compilerCodes[filename] = code.content
      return compilerCodes
    }, {})
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

  public handleConsoleLog(message: any, ...messages: any[]) {
    console.log('%c[COMPILER]', 'color: #0bc0cf', message, ...messages)
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
    return wasmHandler.getInlayHints({
      in: {
        name: currentFilename,
        code: this.codes2CompileCode(codes)
      }
    })
  }

  public async getDiagnostics(currentFilename: string, codes: Code[]): Promise<Diagnostic[]> {
    const wasmHandler = await this.waitForWasmInit()
    return wasmHandler.getDiagnostics({
      in: {
        name: currentFilename,
        code: this.codes2CompileCode(codes)
      }
    })
  }

  public async getCompletionItems(
    currentFilename: string,
    codes: Code[],
    line: number,
    column: number
  ): Promise<CompletionItem[]> {
    const wasmHandler = await this.waitForWasmInit()
    return wasmHandler.getCompletionItems({
      in: {
        line,
        column,
        code: this.codes2CompileCode(codes),
        name: currentFilename
      }
    })
  }

  public async getDefinition(currentFilename: string, codes: Code[]): Promise<Definition[]> {
    const wasmHandler = await this.waitForWasmInit()
    return wasmHandler.getDefinition({
      in: {
        name: currentFilename,
        code: this.codes2CompileCode(codes)
      }
    })
  }

  public async getTokenDetail(tokenId: TokenId): Promise<TokenDetail | null> {
    const wasmHandler = await this.waitForWasmInit()
    return wasmHandler.getTokenDetail({
      in: tokenId
    })
  }

  public async getTokensDetail(tokens: Array<TokenId>): Promise<TokenDetail[]> {
    const wasmHandler = await this.waitForWasmInit()
    return wasmHandler.getTokensDetail({
      in: { tokens }
    })
  }
}
