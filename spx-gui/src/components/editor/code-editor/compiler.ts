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
  getDiagnostics: (params: { in: { name: string; code: CompilerCodes } }) => Diagnostic[] | {}
  getDefinition: (params: { in: { name: string; code: CompilerCodes } }) => Definition[] | {}
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

export type Diagnostic = {
  filename: string
  column: number
  line: number
  message: string
}

type CompletionItem = {
  type: CompletionItemEnum
  label: string
  insertText: string
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

export interface Definition {
  // `start_pos` and `end_pos` is file offset, not compatible with monaco api `getOffset` return offset
  start_pos: number
  end_pos: number
  start_position: Position
  // `end_position` is no use for it is same as `start_position` no difference
  end_position: Position
  pkg_name: string
  // `name` and `pkg_path` can transfer to `module` and `name` for type `TokenId`
  pkg_path: string
  name: string
  usages: DefinitionUsage[]
  struct_name: string
}

// todo: this is same as function `getTokens.TokenUsage` result, need be updated when `getTokens` is declared
export interface DefinitionUsage {
  usageID: string
  declaration: string
  sample: string
  insert_text: string
  params: Array<{
    name: string
    type: string
  }>
  type: string
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
    const res = wasmHandler.getInlayHints({
      in: {
        name: currentFilename,
        code: this.codes2CompileCode(codes)
      }
    })
    return Array.isArray(res) ? res : []
  }

  public async getDiagnostics(currentFilename: string, codes: Code[]): Promise<Diagnostic[]> {
    const wasmHandler = await this.waitForWasmInit()
    const res = wasmHandler.getDiagnostics({
      in: {
        name: currentFilename,
        code: this.codes2CompileCode(codes)
      }
    })
    return Array.isArray(res) ? res : []
  }

  public async getCompletionItems(
    currentFilename: string,
    codes: Code[],
    position: Position
  ): Promise<CompletionItem[]> {
    await this.waitForWasmInit()

    // implement logic here
    return []
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
