type Dispose = () => void

type RuntimeErrors = {
  errors: RuntimeError[]
  fileHash: string
}

type RuntimeError = {
  message: string
  position: Position
}

type Position = {
  line: number
  column: number
  fileUri: string
}

export class Runtime {
  public onRuntimeErrors(cb: (errors: RuntimeErrors) => void): Dispose {
    return () => {}
  }
}
