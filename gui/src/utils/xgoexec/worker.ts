/// <reference lib="webworker" />

import '@/assets/wasm/wasm_exec.js'

import type { MainMessage, WorkerMessage, XGoErrorPhase, XGoExitReason } from './protocol'

declare const self: DedicatedWorkerGlobalScope
declare class Go {
  importObject: WebAssembly.Imports
  run(instance: WebAssembly.Instance): Promise<void>
}

const wasmUrl = new URL('@/assets/wasm/xgoexec.wasm', import.meta.url).href
const scope = self as unknown as {
  postMessage(message: WorkerMessage): void
  addEventListener(type: 'message', listener: (event: MessageEvent<MainMessage>) => void): void
}
const bridge = globalThis as unknown as {
  xbuilder_xgoexec_configure(framework: string): Promise<void>
  xbuilder_xgoexec_build(files: Record<string, Uint8Array>): Promise<void>
  xbuilder_xgoexec_run(): Promise<void>
  xbuilder_xgoexec_dispatch_event(name: string, payload: string): Promise<void>
  xbuilder_xgoexec_resolve_capability_call(id: number, result: string, error: string): void
  xbuilder_xgoexec_ready(): void
  xbuilder_xgoexec_error(phase: 'runtime', message: string): void
  xbuilder_xgoexec_exit(reason: XGoExitReason): void
  xbuilder_xgoexec_capability_call(id: number, name: string, request: string): void
}
let exited = false
let started = false
let pendingExit: XGoExitReason | null = null
const workerConsole = globalThis.console
const logToConsole = workerConsole.log.bind(workerConsole)

workerConsole.log = (...values) => {
  scope.postMessage({ type: 'output', message: values.map(String).join(' ') })
  logToConsole(...values)
}

bridge.xbuilder_xgoexec_ready = () => scope.postMessage({ type: 'ready' })
bridge.xbuilder_xgoexec_error = (phase, message) => scope.postMessage({ type: 'error', phase, message })
bridge.xbuilder_xgoexec_exit = (reason) => {
  if (started) emitExit(reason)
  else pendingExit = reason
}
bridge.xbuilder_xgoexec_capability_call = (id, name, request) =>
  scope.postMessage({ type: 'capabilityCall', id, name, request: JSON.parse(request) })

async function runProject(message: Extract<MainMessage, { type: 'run' }>) {
  try {
    await bridge.xbuilder_xgoexec_configure(message.framework)
  } catch (error) {
    fail('configuration', error)
    return
  }
  try {
    await bridge.xbuilder_xgoexec_build(message.files)
  } catch (error) {
    fail('build', error)
    return
  }
  try {
    await bridge.xbuilder_xgoexec_run()
    started = true
    scope.postMessage({ type: 'started' })
    if (pendingExit != null) emitExit(pendingExit)
  } catch (error) {
    fail('runtime', error)
  }
}
async function dispatchEvent(message: Extract<MainMessage, { type: 'event' }>) {
  try {
    await bridge.xbuilder_xgoexec_dispatch_event(message.name, JSON.stringify(message.payload ?? null))
    scope.postMessage({ type: 'eventResult', id: message.id, error: null })
  } catch (error) {
    scope.postMessage({ type: 'eventResult', id: message.id, error: messageOf(error) })
  }
}
function resolveCapabilityCall(message: Extract<MainMessage, { type: 'capabilityCallResult' }>) {
  let result = 'null'
  let error = message.error ?? ''
  if (error === '') {
    try {
      result = JSON.stringify(message.result ?? null)
    } catch (reason) {
      error = messageOf(reason)
    }
  }
  bridge.xbuilder_xgoexec_resolve_capability_call(message.id, result, error)
}
function fail(phase: XGoErrorPhase, error: unknown) {
  scope.postMessage({ type: 'error', phase, message: messageOf(error) })
  emitExit('error')
}
function emitExit(reason: XGoExitReason) {
  if (exited) return
  exited = true
  scope.postMessage({ type: 'exit', reason })
}
function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

scope.addEventListener('message', (event) => {
  const message = event.data
  switch (message.type) {
    case 'run':
      void runProject(message)
      break
    case 'capabilityCallResult':
      resolveCapabilityCall(message)
      break
    case 'event':
      void dispatchEvent(message)
      break
  }
})

async function main() {
  try {
    const go = new Go()
    const { instance } = await WebAssembly.instantiateStreaming(fetch(wasmUrl), go.importObject)
    void go.run(instance).catch((error) => fail('initialization', error))
  } catch (error) {
    fail('initialization', error)
  }
}
void main()
