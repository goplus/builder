import gopWasmIndexHtml from '@/assets/gop/index.html?url'
import { Disposable } from '@/utils/disposable'
import type { Markdown } from "./EditorUI"

// todo: consider moving into compiler.d.ts
declare global {
  interface Window {
    getInlayHints: (params: { in: { name: string; code: string } }) => Hint[] | {}
  }
}

export enum CodeEnum {
  Sprite,
  Backdrop
}

enum CompletionItemEnum { }

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

type AttentionHint = {
  range: Range
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
  containerElement: HTMLElement | null = null
  public isWasmInit = false
  private executionQueue: (() => void)[] = []
  private lastExecutionTime: number = 0

  createIframe() {
    if (!this.containerElement) return
    const iframe = document.createElement('iframe')
    iframe.width = '0'
    iframe.height = '0'
    iframe.src = gopWasmIndexHtml
    this.containerElement.appendChild(iframe)

    this.addDisposer(() => {
      this.containerElement?.remove()
      this.isWasmInit = false
      window.removeEventListener('message', this.handleWindowMessage)
    })
  }

  reloadIframe() {
    const iframe = this.getIframe()
    if (iframe) {
      iframe.contentWindow?.location.reload()
    }
  }

  getIframe() {
    // this container element only append iframe element, so here we force transform type to HTMLIFrameElement
    return this.containerElement?.firstElementChild as HTMLIFrameElement | null | undefined
  }

  public setContainerElement(containerElement: HTMLElement) {
    if (this.containerElement) {
      window.removeEventListener('message', this.handleWindowMessage)
      this.containerElement.remove()
      this.isWasmInit = false
    }
    this.containerElement = containerElement
    window.addEventListener('message', this.handleWindowMessage.bind(this))
    this.createIframe()
  }

  public handleWindowMessage(event: MessageEvent<{ log: any[]; level: string }>) {
    if (event.origin !== window.location.origin) {
      return
    }

    const data = event.data
    switch (data.level) {
      case 'log': {
        const [message] = data.log || []
        if (!message) return
        if (message.includes('goroutine ')) this.reloadIframe()
        if (message === 'WASM Init') {
          this.isWasmInit = true
          this.executeQueue()
        }
      }
    }
  }

  private executeQueue() {
    while (this.executionQueue.length > 0) {
      const task = this.executionQueue.shift()
      if (task) task()
    }
  }

  private addToQueue(task: () => void) {
    const now = Date.now()
    if (now - this.lastExecutionTime > 5000) {
      this.executionQueue = []
    }
    this.executionQueue = [task]
    this.lastExecutionTime = now
    this.executeQueue()
  }

  private async waitForWasmInit() {
    const MAX_WAIT_TIME = 30000
    const CHECK_INTERVAL = 100

    const startTime = Date.now()
    while (!this.isWasmInit && Date.now() - startTime < MAX_WAIT_TIME) {
      await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL))
    }

    if (!this.isWasmInit) {
      console.warn('WASM initialization timed out')
    }
  }

  public async getInlayHints(codes: Code[]): Promise<Hint[]> {
    if (!this.containerElement) return []
    await this.waitForWasmInit()
    if (!this.isWasmInit) return []

    return new Promise((resolve) => {
      this.addToQueue(() => {
        const iframe = this.getIframe()
        if (iframe == null) return resolve([])

        const tempCodes = codes.map((code) => code.content).join('\r\n')
        try {
          const res = iframe.contentWindow?.getInlayHints({
            in: {
              name: 'test.spx',
              code: tempCodes
            }
          })
          resolve(Array.isArray(res) ? res : [])
        } catch (err) {
          console.error(err)
          resolve([])
        }
      })
    })
  }

  public async getDiagnostics(codes: Code[]): Promise<AttentionHint[]> {
    if (!this.containerElement) return []

    await this.waitForWasmInit()
    if (!this.isWasmInit) return []

    return new Promise((resolve) => {
      this.addToQueue(() => {
        // implement logic here
        resolve([])
      })
    })
  }

  public async getCompletionItems(codes: Code[], position: Position): Promise<CompletionItem[]> {
    if (!this.containerElement) return []

    await this.waitForWasmInit()
    if (!this.isWasmInit) return []

    return new Promise((resolve) => {
      this.addToQueue(() => {
        // implement logic here
        resolve([])
      })
    })
  }

  public async getDefinition(codes: Code[], position: Position): Promise<Token | null> {
    if (!this.containerElement) return null

    await this.waitForWasmInit()
    if (!this.isWasmInit) return null

    return new Promise((resolve) => {
      this.addToQueue(() => {
        // implement logic here
        resolve(null)
      })
    })
  }
}
