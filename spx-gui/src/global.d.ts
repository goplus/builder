declare global {
  class Go {
    argv: string[]
    env: { [envKey: string]: string }
    exit: (code: number) => void
    importObject: WebAssembly.Imports
    exited: boolean
    mem: DataView
    run(instance: WebAssembly.Instance): Promise<void>
  }
}

// If your module exports nothing, you'll need this line. Otherwise, delete it
export {}
