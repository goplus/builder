import { Disposable } from '@/utils/disposable'

export type Position = { line: number; column: number; fileUri: string; abledToJump: boolean }

export type RuntimeLog = {
  message: string
  position: Position
  filesHash: string
}

type Log = { type: 'log' | 'warn'; args: unknown[] }

export class Runtime extends Disposable {
  runtimeLogs: RuntimeLog[] = []

  addRuntimeLog(log: Log, filesHash: string) {
    if (
      this.runtimeLogs.length > 0 &&
      filesHash !== this.runtimeLogs[this.runtimeLogs.length - 1].filesHash
    ) {
      this.clearRuntimeErrors()
    }
    const runtimeError = this.parseRuntimeLog(log)
    if (runtimeError !== null) {
      runtimeError.filesHash = filesHash
      this.runtimeLogs = [...this.runtimeLogs, runtimeError]
    }
  }

  private clearRuntimeErrors() {
    this.runtimeLogs = []
  }

  private parseRuntimeLog(log: Log): RuntimeLog | null {
    switch (log.args.length) {
      case 1: {
        const logRegex = /^[^:]+:\d+:\d+ [^:]+: ([^:]+):(\d+):(\d+): (.*)$/
        const match = (log.args[0] as string).match(logRegex)

        if (match) {
          const [_, fileName, lineNumber, columnNumber, message] = match
          const [fileUri] = fileName.split('.')

          const position: Position = {
            line: parseInt(lineNumber),
            column: parseInt(columnNumber),
            fileUri: fileUri,
            abledToJump: true
          }
          return { position, message, filesHash: '' }
        }
        
        //TODO: make message easier to understand
      }
    }
    const msgs = log.args.join(' ')
    return {
      position: { line: 0, column: 0, fileUri: '', abledToJump: false },
      message: msgs,
      filesHash: ''
    }
  }
}
