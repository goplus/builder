// Check `.github/instructions/browser-compatibility.instructions.md` for polyfill management details.

import 'scheduler-polyfill'

// Simple polyfill for AbortSignal.timeout() and AbortSignal.any()
// NOTE: Report for the two APIs is not yet supported by `eslint-plugin-compat`, see https://github.com/amilajack/eslint-plugin-compat/issues/673
// So there's no corresponding configuration for them in `eslint.config.js`. We may add them later when the issue is resolved.
if (typeof AbortSignal.timeout !== 'function') {
  AbortSignal.timeout = (milliseconds: number) => {
    const controller = new AbortController()
    function abort() {
      controller.abort(new DOMException('Timed out', 'TimeoutError'))
    }
    function clean() {
      window.clearTimeout(timer)
      controller.signal.removeEventListener('abort', clean)
    }
    controller.signal.addEventListener('abort', clean)
    const timer = window.setTimeout(abort, milliseconds)
    return controller.signal
  }
}
if (typeof AbortSignal.any !== 'function') {
  AbortSignal.any = (signals: AbortSignal[]) => {
    const controller = new AbortController()
    // return immediately if any of the signals are already aborted.
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort(signal.reason)
        return controller.signal
      }
    }
    function abort(this: AbortSignal) {
      controller.abort(this.reason)
      clean()
    }
    function clean() {
      for (const signal of signals) {
        signal.removeEventListener('abort', abort)
      }
    }
    // abort the controller (and clean up) when any of the signals aborts
    for (const signal of signals) {
      signal.addEventListener('abort', abort)
    }
    return controller.signal
  }
}
