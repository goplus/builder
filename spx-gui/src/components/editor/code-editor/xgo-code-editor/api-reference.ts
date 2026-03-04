/**
 * @desc IAPIReferenceProvider interface.
 */

import type { LocaleMessage } from '@/utils/i18n'
import type { BaseContext, DefinitionDocumentationItem } from './common'

export type APIReferenceItem = DefinitionDocumentationItem

export type APIReferenceContext = BaseContext

export type APICategoryViewInfo = {
  id: string
  label: LocaleMessage
  /** Raw SVG string for the category icon */
  icon: string
  color: string
  subCategories: Array<{
    id: string
    label: LocaleMessage
  }>
}

export interface IAPIReferenceProvider {
  provideAPIReference(ctx: APIReferenceContext): Promise<APIReferenceItem[]>
  /** Provide view info (labels, icons, colors) for categories. Returns null if not available. */
  provideCategoryViewInfos(): APICategoryViewInfo[] | null
}
