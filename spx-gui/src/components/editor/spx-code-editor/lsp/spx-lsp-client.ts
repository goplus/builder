import { XGoLSPClient } from '@/components/xgo-code-editor/lsp/xgo-lsp-client'
import type { IXGoProject } from '@/components/xgo-code-editor'
import { spxClassFrameworkConfig } from './class-framework'

export class SpxLSPClient extends XGoLSPClient {
  constructor(project: IXGoProject) {
    super(project, {
      classFrameworkConfig: spxClassFrameworkConfig
    })
  }
}
