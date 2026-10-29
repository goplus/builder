import type { APIReferenceItem } from '../../api-reference'

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function searchAPIReferenceItems(items: APIReferenceItem[], query: string): APIReferenceItem[] {
  const normalizedQuery = normalize(query)
  if (normalizedQuery === '') return items
  const keywords = [...new Set(normalizedQuery.split(' '))]
  return items
    .map((item, index) => {
      const name = normalize(item.definition.name ?? '')
      const method = name.slice(name.lastIndexOf('.') + 1)
      const aliases = (item.searchKeywords ?? []).map(normalize)
      const detail = item.detail.value
      const fields = [
        name,
        item.overview,
        ...(typeof detail === 'string' ? [detail] : Object.values(detail)),
        ...aliases
      ].map(normalize)
      const matchedKeywords = keywords.filter((keyword) => fields.some((field) => field.includes(keyword))).length
      const exact = name === normalizedQuery || method === normalizedQuery || aliases.includes(normalizedQuery)
      // Match phrases within each field, never across adjacent names, descriptions or aliases.
      const completeness = exact ? 2 : fields.some((field) => field.includes(normalizedQuery)) ? 1 : 0
      return { item, index, matchedKeywords, completeness }
    })
    .filter((result) => result.matchedKeywords > 0)
    .sort((a, b) => b.completeness - a.completeness || b.matchedKeywords - a.matchedKeywords || a.index - b.index)
    .map((result) => result.item)
}
