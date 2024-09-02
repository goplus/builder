import gopWasmIndexHtml from '@/assets/gop/index.html?url'
import { Disposable } from '@/utils/disposable'

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

type TokenUsage = {
  // declaration signature
  desc: string
  insertText: string
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
        if (message === 'WASM Init') this.isWasmInit = true
      }
    }
  }

  public getContainerElement() {
    return this.containerElement
  }

  public getInlayHints(codes: Code[]): Hint[] {
    const iframe = this.getIframe()
    if (iframe == null) return []

    const tempCodes = codes.map((code) => code.content).join('\r\n')
    // todo: only one file allow, should allow multi files
    try {
      const res = iframe.contentWindow?.getInlayHints({
        in: {
          name: 'test.spx',
          code: tempCodes
        }
      })
      return Array.isArray(res) ? res : []
    } catch (err) {
      console.error(err)
    }

    return []
  }
  public getDiagnostics(codes: Code[]): AttentionHint[] {
    if (!this.containerElement) return []
    return []
  }
  public getCompletionItems(codes: Code[], position: Position): CompletionItem[] {
    if (!this.containerElement) return []
    return []
  }
  public getDefinition(codes: Code[], position: Position): Token | null {
    if (!this.containerElement) return null
    return null
  }
}
