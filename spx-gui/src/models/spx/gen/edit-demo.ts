import { File } from '../../common/file'

export let spriteEditDemoEnabled = false

export function setSpriteEditDemoEnabled(enabled: boolean) {
  spriteEditDemoEnabled = enabled
}

/** Demo-only result: preserve the input media instead of calling an AI editing API. */
export async function simulateSpriteEdit(source: File, signal: AbortSignal) {
  signal.throwIfAborted()
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, 3000)
    function onAbort() {
      clearTimeout(timer)
      reject(signal.reason)
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
  signal.throwIfAborted()
  return new File(source.name, (signal) => source.arrayBuffer(signal), { type: source.type })
}
