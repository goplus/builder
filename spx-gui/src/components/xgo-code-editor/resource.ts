/**
 * @desc IResourceAdapter interface + ResourceAdapter default implementation.
 * Uses ILSPClient. No spx-specific knowledge.
 */

import type { LocaleMessage } from '@/utils/i18n'
import type { ComponentDefinition } from '@/utils/types'
import type { BaseContext, ResourceReference, ResourceIdentifier } from './common'
import type { ILSPClient } from './lsp/types'

export type GetResourceReferencesContext = BaseContext

export interface IResourceSelector {
  title: LocaleMessage
  getItems: () => ResourceIdentifier[]
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

export interface IResourceAdapter {
  /** Query resource references from the current text document. */
  provideResourceReferences(ctx: GetResourceReferencesContext): Promise<ResourceReference[]>
  /** Get a resource selector for the given resource context URI. */
  provideResourceSelector(contextURI: string): IResourceSelector | null
  /**
   * Provide a Vue component to render resource items.
   * Returns null if no renderer is available.
   */
  provideResourceItemRenderer(): ResourceItemComponent | null
  /** Get the display name for given resource identifier. */
  provideResourceName(resource: ResourceIdentifier): string
  /** Request the host app to rename the given resource. */
  requestResourceRename?(resource: ResourceIdentifier): Promise<void>
  /** Request the host app to open or focus the given resource. */
  openResource?(resource: ResourceIdentifier): Promise<void>
}

/**
 * Default implementation of IResourceAdapter.
 * Handles reference detection via LSP and returns null from UI extension points.
 * Spx-specific subclass overrides the UI extension points.
 */
export class ResourceAdapter implements IResourceAdapter {
  constructor(private lspClient: ILSPClient) {}
  async provideResourceReferences(ctx: GetResourceReferencesContext): Promise<ResourceReference[]> {
    return this.lspClient.getResourceReferences({ signal: ctx.signal }, ctx.textDocument.id)
  }
  provideResourceSelector(_contextURI: string): IResourceSelector | null {
    return null
  }
  provideResourceItemRenderer(): ResourceItemComponent | null {
    return null
  }
  provideResourceName(resource: ResourceIdentifier): string {
    return resource.uri
  }
}
