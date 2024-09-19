import { Disposable } from '@/utils/disposable'

export type Position = { line: number; column: number; fileUri: string }

export type RuntimeError = {
  message: string
  position: Position
  filesHash: string
}

type Log = { type: 'log' | 'warn'; args: unknown[] }

export class Runtime extends Disposable {
  runtimeErrors: RuntimeError[] = []

  addRuntimeLog(log: Log, filesHash: string) {
    if (
      this.runtimeErrors.length > 0 &&
      filesHash !== this.runtimeErrors[this.runtimeErrors.length - 1].filesHash
    ) {
      this.clearRuntimeErrors()
    }
    const runtimeError = this.parseRuntimeLog(log)
    if (runtimeError !== null) {
      runtimeError.filesHash = filesHash
      this.runtimeErrors.push(runtimeError)
    }
  }

  private clearRuntimeErrors() {
    this.runtimeErrors = []
  }

  private parseRuntimeLog(log: Log): RuntimeError | null {
    switch (log.args.length) {
      case 1: {
        const logRegex = /^[^:]+:\d+:\d+ [^:]+: ([^:]+):(\d+):(\d+): (.*)$/
        const match = (log.args[0] as string).match(logRegex)

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
      }
      default:
        return null
    }
  }
}
