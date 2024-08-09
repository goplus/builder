import type { EditorUI } from '@/components/editor/code-editor/EditorUI'
import { Runtime } from '../runtime'
import { Compiler } from '../compiler'
import { AIChat } from '../ai-chat'
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
    models: {
      runtime: Runtime
      compiler: Compiler
      aiChat: AIChat
      docAbility: DocAbility
      project: Project
    }
  ) {}

  public jump(position: Position): void {}
}
