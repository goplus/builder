import type { APIReferenceItem } from './api-reference'

/** Scores an exact name match above a partial name or signature match. */
export function getAPIReferenceNameMatch(item: APIReferenceItem, query: string): 0 | 1 | 2 {
  const normalized = query.trim().toLowerCase()
  const name = (item.definition.name ?? '').toLowerCase()
  const method = name.slice(name.lastIndexOf('.') + 1)
  if (name === normalized || method === normalized) return 2
  return name.includes(normalized) || item.overview.toLowerCase().includes(normalized) ? 1 : 0
}

export function searchAPIReferenceNames(items: APIReferenceItem[], query: string): APIReferenceItem[] {
  return items.filter((item) => getAPIReferenceNameMatch(item, query) > 0)
}
