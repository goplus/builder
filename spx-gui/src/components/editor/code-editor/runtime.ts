import Emitter from '@/utils/emitter'
import type { TextDocumentRange } from './common'

enum RuntimeOutputKind {
  Error,
  Log
}

interface RuntimeOutput {
  kind: RuntimeOutputKind
  time: number
  message: string
  source: TextDocumentRange
}

export class Runtime extends Emitter<{
  didChangeOutput: []
}> {
  async getOutput(): Promise<RuntimeOutput[]> {
    console.warn('TODO')
    return []
  }
}
