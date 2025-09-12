import type { WatchSource } from 'vue'

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

  // Typing for https://github.com/konvajs/vue-konva/blob/master/src/components/KonvaNode.ts
  // TODO: it is better to import it from vue-konva, but it is not exported by vue-konva now
  type KonvaNodeInstance<T> = {
    getNode(): T
  }
}

declare module 'vue' {
  // Fix type inference issue with `toValue`
  export function toValue<T>(source: WatchSource<T> | T): T
}

declare module 'textarea-caret' {
  export function getCaretCoordinates(
    element: HTMLTextAreaElement,
    position: number
  ): {
    top: number
    left: number
    height: number
  }
}

// This empty `export {}` is required for `declare` to work, because there's no other exports for this module.
// See details in https://www.typescriptlang.org/docs/handbook/declaration-files/templates/global-modifying-module-d-ts.html
export {}
