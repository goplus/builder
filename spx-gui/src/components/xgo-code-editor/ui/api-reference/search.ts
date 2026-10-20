import type { APIReferenceItem } from '../../api-reference'

export function searchAPIReferenceItems(items: APIReferenceItem[], query: string): APIReferenceItem[] {
  const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (keywords.length === 0) return items
  return items.filter((item) => {
    const detail = item.detail.value
    const text = [
      item.definition.name ?? '',
      item.overview,
      ...(typeof detail === 'string' ? [detail] : Object.values(detail)),
      ...(item.searchKeywords ?? [])
    ]
      .join(' ')
      .toLowerCase()
    return keywords.every((keyword) => text.includes(keyword))
  })
}
