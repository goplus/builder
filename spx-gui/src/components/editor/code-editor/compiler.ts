import compilerWasmHtml from '@/assets/compiler/index.html?raw'
import compilerWasm from '@/assets/compiler/main.wasm?url'
import compilerWasmExec from '@/assets/wasm_exec.js?url'
import { Disposable } from '@/utils/disposable'
import type { Markdown } from './EditorUI'
import { shallowRef } from 'vue'
import { untilNotNull } from '@/utils/utils'

export type CompilerCodes = { [k: string]: string }

interface WasmHandler extends Window {
  console: typeof console
  getInlayHints: (params: { in: { name: string; code: CompilerCodes } }) => Hint[] | {}
  getDiagnostics: (params: { in: { name: string; code: CompilerCodes } }) => Diagnostics[] | {}
  getCompletionItems: (params: {
    in: { name: string; code: CompilerCodes; line: number; column: number }
  }) => CompletionItem[] | {}
}

export enum CodeEnum {
  Sprite,
  Stage
}

enum CompletionItemEnum {}

export interface Hint {
  start_pos: number
  end_pos: number
  start_position: Position
  end_position: Position
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

export type Diagnostics = {
  filename: string
  column: number
  line: number
  message: string
}

type CompletionItem = {
  label: string
  insert_text: string
  type: string
  token_name: string
  token_pkg: string
}

export type TokenId = {
  // "github.com/goplus/spx"
  module: string
  // "Sprite.touching"
  name: string
}

type UsageId = string

type TokenUsage = {
  id: UsageId
  effect: string
  declaration: string
  sample: string
  insertText: string
}

export type UsageDoc = Markdown

export type TokenDoc = Array<{
  id: UsageId
  doc: UsageDoc
}>

export type Token = {
  id: TokenId
  usages: TokenUsage
}

type Code = {
  filename: string
  content: string
}

export class Compiler extends Disposable {
  containerElement: HTMLIFrameElement | null = null
  private wasmHandlerRef = shallowRef<WasmHandler | null>()

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
    this.containerElement?.contentWindow?.location.reload()
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
    this.initIframe()
  }

  public handleConsoleLog(message: any) {
    if (!message) return
    if (message.includes('goroutine ')) this.reloadIframe()
    if (message === 'WASM Init') this.handleWasmReady()
  }

  private handleWasmReady() {
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

  public async getDiagnostics(currentFilename: string, codes: Code[]): Promise<Diagnostics[]> {
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

  public async getDefinition(
    currentFilename: string,
    codes: Code[]
  ): Promise</* temp return null */ null> {
    await this.waitForWasmInit()

    // implement logic here
    return null
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
