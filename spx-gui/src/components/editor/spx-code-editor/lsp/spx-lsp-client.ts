import type { SpxProject } from '@/models/spx/project'
import { XGoLSPClient } from '@/components/xgo-code-editor/lsp/xgo-lsp-client'
import type { PropertyRenamedEvent, RequestContext } from '@/components/xgo-code-editor'

import { spxClassfileConfig } from './class-framework'

export class SpxLSPClient extends XGoLSPClient {
  constructor(project: SpxProject) {
    super(project, { classfileConfig: spxClassfileConfig, sourceExtensions: ['.spx', '.json'] })
  }

  override onPropertyRenamed(handler: (event: PropertyRenamedEvent) => void) {
    return super.onPropertyRenamed((event) =>
      handler({ ...event, target: event.target === 'Game' ? '' : event.target })
    )
  }

  override getProperties(ctx: RequestContext, target: string) {
    return super.getProperties(ctx, target === '' ? 'Game' : target)
  }
}
