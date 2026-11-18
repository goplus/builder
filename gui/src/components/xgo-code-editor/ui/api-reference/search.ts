import type { APIReferenceItem } from '../../api-reference'
import { stringifyDefinitionId } from '../../definition-id'

export function getAPIReferenceSearchText(item: APIReferenceItem): string {
  const detail = item.detail.value
  return [
    `API: ${item.definition.name ?? item.overview}`,
    `Signature: ${item.overview}`,
    ...(typeof detail === 'string' ? [detail] : [`Description (en): ${detail.en}`, `Description (zh): ${detail.zh}`])
  ].join('\n')
}

function nameMatch(item: APIReferenceItem, query: string): number {
  const name = (item.definition.name ?? '').toLowerCase()
  const method = name.slice(name.lastIndexOf('.') + 1)
  if (name === query || method === query) return 2
  return name.includes(query) || item.overview.toLowerCase().includes(query) ? 1 : 0
}

export function rankAPIReferenceResults(
  items: APIReferenceItem[],
  query: string,
  results: Array<{ id: string; score: number }>,
  threshold: number
): APIReferenceItem[] {
  const scores = new Map(results.map(({ id, score }) => [id, score]))
  const normalizedQuery = query.trim().toLowerCase()
  return items
    .map((item, index) => ({
      item,
      index,
      name: nameMatch(item, normalizedQuery),
      score: scores.get(stringifyDefinitionId(item.definition)) ?? -1
    }))
    .filter(({ name, score }) => name > 0 || score >= threshold)
    .sort((a, b) => b.name - a.name || b.score - a.score || a.index - b.index)
    .map(({ item }) => item)
}

export function searchAPIReferenceNames(items: APIReferenceItem[], query: string): APIReferenceItem[] {
  return items.filter((item) => nameMatch(item, query.trim().toLowerCase()) > 0)
}
