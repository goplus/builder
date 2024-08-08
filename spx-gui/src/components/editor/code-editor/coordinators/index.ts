import type { EditorUI } from '@/components/editor/code-editor/EditorUI'
import { Runtime } from '../models/runtime'
import { Compiler } from '../models/compiler'
import { AIChat } from '../models/ai-chat'
import { DocAbility } from '../models/document'
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
