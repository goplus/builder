/**
 * @desc IResourceProvider interface + ResourceProvider default implementation.
 * Uses ILSPClient. No spx-specific knowledge.
 */

import type { LocaleMessage } from '@/utils/i18n'
import type { BaseContext, ResourceReference, ResourceIdentifier } from './common'
import type { ILSPClient } from './lsp/types'
import type { ComponentDefinition } from '@/utils/types'

export type ProvideResourcesReferencesContext = BaseContext

export interface IResourceSelector {
  items: ResourceIdentifier[]
  /** Methods to create new resources. Handler returns the created resource, or null if nothing created. */
  createMethods: Array<{ label: LocaleMessage; handler: () => Promise<ResourceIdentifier | null> }>
}

/** Props contract for resource item components */
export type ResourceItemComponentProps = {
  resource: ResourceIdentifier
  selectable?: false | { selected: boolean }
  autoplay?: boolean
}

export type ResourceItemComponent = ComponentDefinition<ResourceItemComponentProps, {}>

export interface IResourceProvider {
  provideResourceReferences(ctx: ProvideResourcesReferencesContext): Promise<ResourceReference[]>
  /**
   * Get a resource selector for the given resource context URI.
   * Returns null if no selector is available for the given context.
   *
   * **Vue setup context required**: implementations may call Vue composables internally.
   * This method must be called from a Vue component's `setup()` function (or equivalent
   * reactive context). Calling it inside a `watch` callback, an async handler, or outside
   * a component lifecycle will cause `inject()` warnings and silently broken behaviour.
   */
  useResourceSelector(contextURI: string): IResourceSelector | null
  provideResourceSelectorTitle(contextURI: string): LocaleMessage
  /**
   * Provide a Vue component to render resource items.
   * Returns null if no renderer is available.
   */
  provideResourceItemRenderer(): ResourceItemComponent | null

  provideResourceName(resource: ResourceIdentifier): string
}

/**
 * Default implementation of IResourceProvider.
 * Handles reference detection via LSP and returns null from UI extension points.
 * Spx-specific subclass overrides the UI extension points.
 */
export class ResourceProvider implements IResourceProvider {
  constructor(private lspClient: ILSPClient) {}

  async provideResourceReferences(ctx: ProvideResourcesReferencesContext): Promise<ResourceReference[]> {
    return this.lspClient.getResourceReferences({ signal: ctx.signal }, ctx.textDocument.id)
  }

  useResourceSelector(_contextURI: string): IResourceSelector | null {
    return null
  }

  provideResourceSelectorTitle(_contextURI: string): LocaleMessage {
    return { en: '', zh: '' }
  }

  provideResourceItemRenderer(): ResourceItemComponent | null {
    return null
  }

  provideResourceName(resource: ResourceIdentifier): string {
    return resource.uri
  }
}
