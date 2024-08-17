import {
  type CompletionItem,
  type EditorUI,
  Icon,
  type TextModel
} from '@/components/editor/code-editor/EditorUI'
import { Runtime } from '../runtime'
import { Compiler } from '../compiler'
import { ChatBot } from '../chat-bot'
import { DocAbility } from '../document'
import { Project } from '@/models/project'
import { type Position } from 'monaco-editor'

type JumpPosition = {
  line: number
  column: number
  fileUri: string
}

export class Coordinator {
  constructor(
    ui: EditorUI,
    runtime: Runtime,
    compiler: Compiler,
    chatBot: ChatBot,
    docAbility: DocAbility,
    project: Project
  ) {
    ui.registerCompletionProvider({
      provideDynamicCompletionItems: this.implementsCompletionProvider
    })
  }

  implementsCompletionProvider(
    model: TextModel,
    ctx: {
      position: Position
      unitWord: string
      signal: AbortSignal
    },
    addItems: (items: CompletionItem[]) => void
  ) {
    // testing sample code:
    // setTimeout(() => {
    //   addItems([
    //     {
    //       label: 'test',
    //       insertText: 'test',
    //       desc: 'test',
    //       preview: {
    //         content: 'test'
    //       },
    //       icon: Icon.Document
    //     }
    //   ])
    // }, 1000)
    // setTimeout(() => {
    //   addItems([
    //     {
    //       label: 'test23',
    //       insertText: 'test23',
    //       desc: 'test23',
    //       preview: {
    //         content: 'test'
    //       },
    //       icon: Icon.Document
    //     }
    //   ])
    // }, 1300)
    // setTimeout(() => {
    //   addItems([
    //     {
    //       label: 'test33',
    //       insertText: 'test33',
    //       desc: 'test33',
    //       preview: {
    //         content: 'test'
    //       },
    //       icon: Icon.Document
    //     }
    //   ])
    // }, 1500)
  }

  public jump(position: JumpPosition): void {}
}
