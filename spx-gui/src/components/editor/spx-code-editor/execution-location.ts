import Emitter from '@/utils/emitter'
import type { Runtime } from '@/components/editor/runtime'
import type { ExecutionLocation, IExecutionLocationProvider } from '@/components/xgo-code-editor'

export class SpxExecutionLocationProvider
  extends Emitter<{ didChangeExecutionLocation: void }>
  implements IExecutionLocationProvider
{
  constructor(private runtime: Runtime) {
    super()
    this.addDisposer(runtime.on('didChangeLocation', () => this.emit('didChangeExecutionLocation')))
  }

  provideExecutionLocation(): ExecutionLocation | null {
    return this.runtime.location
  }
}
