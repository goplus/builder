/**
 * @desc IAPIReferenceProvider interface.
 */

import type { LocaleMessage } from '@/utils/i18n'
import type { BaseContext, DefinitionDocumentationItem } from './common'

export type APIReferenceItem = DefinitionDocumentationItem

/**
 * Predicate to narrow which API reference items are shown in the panel.
 * `null` (no filter) means show all items. The editor stays agnostic about how
 * the predicate is built; consumers decide the rule.
 */
export type APIReferenceFilter = (item: APIReferenceItem) => boolean

export type APIReferenceVideo = {
  /** Title of the video, typically the API name */
  title: LocaleMessage
  /** URL of the video */
  src: string
}

/**
 * Provides an explainer video for an API reference item, shown in its hover card.
 * Returns `null` when the item has none. The editor stays agnostic about where the
 * videos come from; features (e.g. tutorials) decide.
 */
export type APIReferenceVideoProvider = (item: APIReferenceItem) => APIReferenceVideo | null

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
  /** Provide view info (labels and icons) for categories. Returns null if not available. */
  provideCategoryViewInfos(): APICategoryViewInfo[] | null
}

export class EmptyAPIReferenceProvider implements IAPIReferenceProvider {
  async provideAPIReference(): Promise<APIReferenceItem[]> {
    return []
  }

  provideCategoryViewInfos(): APICategoryViewInfo[] | null {
    return null
  }
}
