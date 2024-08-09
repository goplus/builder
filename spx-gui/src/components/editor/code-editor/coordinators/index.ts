import type { EditorUI } from '@/components/editor/code-editor/EditorUI'
import { Runtime } from '../runtime'
import { Compiler } from '../compiler'
import { ChatBot } from '../chat-bot'
import { DocAbility } from '../document'
import { Project } from '@/models/project'

type Position = {
  line: number
  column: number
  fileUri: string
}

export class Coordinator {
  constructor(
    ui: EditorUI,
    abilities: {
      runtime: Runtime
      compiler: Compiler
      chatBot: ChatBot
      docAbility: DocAbility
      project: Project
    }
  ) {}

  public jump(position: Position): void {}
}
