/**
 * @desc SpxResourceProvider — spx-specific resource provider.
 * Extends the generic ResourceProvider with spx-specific UI extension points.
 */

import type { LocaleMessage } from '@/utils/i18n'
import { humanizeResourceType } from '@/models/spx/common/resource'
import type { SpxProject } from '@/models/spx/project'
import type { SpxLSPClient } from './lsp/spx-lsp-client'
import {
  type ResourceIdentifier,
  ResourceProvider,
  type IResourceSelector,
  type ResourceItemComponent
} from '../xgo-code-editor'
import { getResourceNameWithType, parseResourceContextURI, getResourceURI } from './common'
import { createResourceSelector } from './ui/resource/resource-selector'
import SpxResourceItem from './ui/resource/SpxResourceItem.vue'

export class SpxResourceProvider extends ResourceProvider {
  constructor(
    lspClient: SpxLSPClient,
    private project: SpxProject
  ) {
    super(lspClient)
  }

  /**
   * Provide a resource selector for the given resource context URI.
   * Must be called from Vue setup context, as it calls Vue composables internally.
   */
  override useResourceSelector(contextURI: string): IResourceSelector | null {
    const project = this.project
    const selector = createResourceSelector(project, contextURI)
    const createMethods = selector.useCreateMethods()
    return {
      get items() {
        return selector.items.map((item) => {
          const uri = getResourceURI(item)
          return { uri }
        })
      },
      createMethods: createMethods.map((m) => ({
        label: m.label,
        handler: async () => {
          const created = await m.handler()
          const firstCreated = Array.isArray(created) ? created[0] : created
          if (firstCreated == null) return null
          const uri = getResourceURI(firstCreated)
          return { uri } satisfies ResourceIdentifier
        }
      }))
    }
  }

  override provideResourceSelectorTitle(contextURI: string): LocaleMessage {
    const { type } = parseResourceContextURI(contextURI)
    const humanizedType = humanizeResourceType(type)
    return { en: `Select a ${humanizedType.en}`, zh: `选择${humanizedType.zh}` }
  }

  override provideResourceItemRenderer(): ResourceItemComponent | null {
    return SpxResourceItem
  }

  override provideResourceName(resource: ResourceIdentifier): string {
    const { name } = getResourceNameWithType(resource.uri)
    return name
  }
}
