import Emitter from '@/utils/emitter'
import type { Runtime } from '@/components/editor/runtime'
import type { ExecutionLocation, IExecutionLocationProvider } from '@/components/xgo-code-editor'

export class SpxExecutionLocationProvider
  extends Emitter<{ didChangeExecutionLocations: void }>
  implements IExecutionLocationProvider
{
  constructor(private runtime: Runtime) {
    super()
    this.addDisposer(runtime.on('didChangeLocations', () => this.emit('didChangeExecutionLocations')))
  }

  provideExecutionLocations(): readonly ExecutionLocation[] {
    return this.runtime.locations
  }
}
