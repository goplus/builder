import { Disposable, type Disposer } from './common/disposable'

export type Position = { line: number; column: number; fileUri: string }

type RuntimeError = {
  message: string
  position: Position
  filesHash: string
}

type Log = { type: 'log' | 'warn'; args: any[] }

export class Runtime extends Disposable {
  runtimeErrors: RuntimeError[] = []

  addRuntimeLog(log: Log, filesHash: string) {
    if (
      this.runtimeErrors.length > 0 &&
      filesHash !== this.runtimeErrors[this.runtimeErrors.length - 1].filesHash
    ) {
      this.clearRuntimeErrors()
    }
    let runtimeError = this.parseRuntimeLog(log)
    runtimeError!.filesHash = filesHash
    this.runtimeErrors.push(runtimeError!)
    this.notifyErrors()
  }

  private clearRuntimeErrors() {
    this.runtimeErrors = []
  }

  private parseRuntimeLog(log: Log): RuntimeError | null {
    switch (log.args.length) {
      case 1:
        const logRegex = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2} .*?: (.*?):(\d+):(\d+): (.*)$/
        const match = log.args[0].match(logRegex)

        if (!match) {
          return null
        }

        const [_, fileName, lineNumber, columnNumber, message] = match

        const [fileUri] = fileName.split('.')

        const position: Position = {
          line: parseInt(lineNumber),
          column: parseInt(columnNumber),
          fileUri: fileUri
        }

        //TODO: make message easier to understand

        return { position, message, filesHash: '' }
      default:
        return null
    }
  }

  private errorCallbacks: ((errors: RuntimeError[]) => void)[] = []

  private notifyErrors() {
    this.errorCallbacks.forEach((cb) => cb(this.runtimeErrors))
  }

  onRuntimeErrors(cb: (errors: RuntimeError[]) => void): Disposer {
    this.errorCallbacks.push(cb)
    const disposer: Disposer = () => {
      this.errorCallbacks = this.errorCallbacks.filter((callback) => callback !== cb)
    }
    this.addDisposer(disposer)
    return disposer
  }
}
