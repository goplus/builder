export type XGoErrorPhase = 'initialization' | 'configuration' | 'build' | 'runtime' | 'capability'
export type XGoExitReason = 'completed' | 'stopped' | 'error'

export type MainMessage =
  | { type: 'run'; framework: string; files: Record<string, Uint8Array> }
  | { type: 'capabilityCallResult'; id: number; result: unknown; error: string | null }
  | { type: 'event'; id: number; name: string; payload: unknown }

export type WorkerMessage =
  | { type: 'ready' }
  | { type: 'started' }
  | { type: 'error'; phase: XGoErrorPhase; message: string }
  | { type: 'exit'; reason: XGoExitReason }
  | { type: 'output'; message: string }
  | { type: 'capabilityCall'; id: number; name: string; request: unknown }
  | { type: 'eventResult'; id: number; error: string | null }
