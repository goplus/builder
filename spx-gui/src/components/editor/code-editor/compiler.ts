import compilerWasmHtml from '@/assets/compiler/index.html?raw'
import compilerWasm from '@/assets/compiler/main.wasm?url'
import compilerWasmExec from '@/assets/wasm_exec.js?url'
import { Disposable } from '@/utils/disposable'
import type { Markdown } from './EditorUI'
import { shallowRef } from 'vue'
import { untilNotNull } from '@/utils/utils'

interface WasmHandler extends Window {
  console: typeof console
  getInlayHints: (params: { in: { name: string; code: string } }) => Hint[] | {}
  getDiagnostics: (params: { in: { name: string; code: string } }) => AttentionHint[] | {}
}

export enum CodeEnum {
  Sprite,
  Stage
}

enum CompletionItemEnum {}

// generated from wasm `console.log`
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

export type AttentionHint = {
  fileName: string
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
  type: CodeEnum
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

  public async getInlayHints(codes: Code[]): Promise<Hint[]> {
    const wasmHandler = await this.waitForWasmInit()

    const tempCodes = codes.map((code) => code.content).join('\r\n')
    const res = wasmHandler.getInlayHints({
      in: {
        name: 'test.spx',
        code: tempCodes
      }
    })
    return Array.isArray(res) ? res : []
  }

  public async getDiagnostics(codes: Code[]): Promise<AttentionHint[]> {
    const wasmHandler = await this.waitForWasmInit()

    const tempCodes = codes.map((code) => code.content).join('\r\n')
    const res = wasmHandler.getDiagnostics({
      in: {
        name: 'test.spx',
        code: tempCodes
      }
    })
    return Array.isArray(res) ? res : []
  }

  public async getCompletionItems(codes: Code[], position: Position): Promise<CompletionItem[]> {
    await this.waitForWasmInit()

    // implement logic here
    return []
  }

  public async getDefinition(codes: Code[], position: Position): Promise<Token | null> {
    await this.waitForWasmInit()

    // implement logic here
    return null
  }
}
