/**
 * @desc IAPIReferenceProvider interface.
 */

import type { LocaleMessage } from '@/utils/i18n'
import type { BaseContext, DefinitionDocumentationItem } from './common'
import { searchAPIReferenceNames } from './api-reference-search'

export type APIReferenceItem = DefinitionDocumentationItem

export type APIReferenceContext = BaseContext

export type APICategoryViewInfo = {
  id: string
  label: LocaleMessage
  /** Raw SVG string for the category icon */
  icon: string
  subCategories: Array<{
    id: string
    label: LocaleMessage
  }>
}

export interface IAPIReferenceProvider {
  provideAPIReference(ctx: APIReferenceContext): Promise<APIReferenceItem[]>
  /** Returns an ordered subset of the supplied, already loaded candidates. */
  searchAPIReference(items: APIReferenceItem[], query: string, signal: AbortSignal): Promise<APIReferenceItem[]>
  /** Provide view info (labels and icons) for categories. Returns null if not available. */
  provideCategoryViewInfos(): APICategoryViewInfo[] | null
}

/** Supplies no items by default. Extend it to reuse local name and signature matching. */
export class EmptyAPIReferenceProvider implements IAPIReferenceProvider {
  async provideAPIReference(): Promise<APIReferenceItem[]> {
    return []
  }

  async searchAPIReference(items: APIReferenceItem[], query: string, signal: AbortSignal): Promise<APIReferenceItem[]> {
    signal.throwIfAborted()
    return searchAPIReferenceNames(items, query)
  }

  provideCategoryViewInfos(): APICategoryViewInfo[] | null {
    return null
  }
}
