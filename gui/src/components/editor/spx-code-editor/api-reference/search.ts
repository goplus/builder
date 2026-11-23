import { type APIReferenceItem, getAPIReferenceNameMatch } from '@/components/xgo-code-editor'

/** Builds stable candidate text from definition documentation. */
export function getAPIReferenceSearchText(item: APIReferenceItem): string {
  const detail = item.detail.value
  return [
    `API: ${item.definition.name ?? item.overview}`,
    `Signature: ${item.overview}`,
    ...(typeof detail === 'string'
      ? [`Description: ${detail}`]
      : [`Description (en): ${detail.en}`, `Description (zh): ${detail.zh}`])
  ].join('\n')
}

/** Ranks the supplied items using name matches and scores from the semantic search API. */
export function rankAPIReferenceResults(
  items: APIReferenceItem[],
  query: string,
  scores: number[]
): APIReferenceItem[] {
  if (scores.length !== items.length) throw new Error('API reference search returned an unexpected number of scores')
  // Exclude weak semantic matches and keep the rest close to the best score.
  const threshold = Math.max(0.6, ...scores.map((score) => score - 0.1))
  // Keep name matches even below the cutoff, and prefer exact names such as setBackdrop over setBackdropAndWait.
  return items
    .map((item, index) => ({
      item,
      index,
      name: getAPIReferenceNameMatch(item, query),
      score: scores[index]
    }))
    .filter(({ name, score }) => name > 0 || score >= threshold)
    .sort((a, b) => b.name - a.name || b.score - a.score || a.index - b.index)
    .map(({ item }) => item)
}
