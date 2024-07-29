import { Disposable, type Disposer } from './common/disposable'

export type Position = { line: number; column: number; fileUri: string }

type RuntimeError = {
  message: string
  position: Position
  filesHash: string
}

type RuntimeErrors = RuntimeError[]

type Log = { type: 'log' | 'warn'; args: any[] }

export class Runtime extends Disposable {
  runtimeErrors: RuntimeErrors | undefined

  handleFilesHash(filesHash: string) {
    //TODO
  }

  handleRuntimeLog(log: Log) {
    //TODO
  }

  private clearRuntimeErrors() {
    //TODO
    this.runtimeErrors = []
  }

  private parseRuntimeLog(logList: Log) {
    //TODO
  }

  private errorCallbacks: ((errors: RuntimeErrors) => void)[] = []

  private nitifyErrors() {
    //TODO
    this.errorCallbacks.forEach((cb) => cb(this.runtimeErrors!))
  }

  onRuntimeErrors(cb: (errors: RuntimeErrors) => void): Disposer {
    //TODO...
    this.errorCallbacks.push(cb)
    const disposer: Disposer = () => {
      this.errorCallbacks = this.errorCallbacks.filter((callback) => callback !== cb)
    }
    this.addDisposer(disposer)
    return disposer
  }
}
