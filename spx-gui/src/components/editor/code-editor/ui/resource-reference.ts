import type Emitter from '@/utils/emitter'
import { type BaseContext, type Range, type ResourceIdentifier } from '../common'

export type ResourceReferencesContext = BaseContext

export type ResourceReference = {
  range: Range
  resource: ResourceIdentifier
}

export interface IResourceReferencesProvider
  extends Emitter<{
    didChangeResourceReferences: []
  }> {
  provideResourceReferences(ctx: ResourceReferencesContext): Promise<ResourceReference[]>
}
