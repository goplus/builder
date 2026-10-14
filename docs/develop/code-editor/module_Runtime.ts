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

declare interface Runtime extends EmitterImpl<{
  didChangeOutputSnapshot: []
}> {
  getOutput(): Promise<RuntimeOutput[]>
}
