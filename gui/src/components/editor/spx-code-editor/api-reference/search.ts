import { createAPIReferenceSearch } from '@/apis/api-reference'
import type { APIReferenceSearch } from '@/components/xgo-code-editor/api-reference'
import { stringifyDefinitionId } from '@/components/xgo-code-editor/definition-id'
import {
  getAPIReferenceSearchText,
  rankAPIReferenceResults
} from '@/components/xgo-code-editor/ui/api-reference/search'

// Calibrated with the current Qwen3 multilingual API Reference corpus.
export const apiReferenceSimilarityThreshold = 0.6

export const searchAPIReferences: APIReferenceSearch = async (items, query, signal) => {
  const { results } = await createAPIReferenceSearch(
    {
      query,
      candidates: items.map((item) => ({
        id: stringifyDefinitionId(item.definition),
        text: getAPIReferenceSearchText(item)
      }))
    },
    signal
  )
  const threshold = Math.max(apiReferenceSimilarityThreshold, ...results.map(({ score }) => score - 0.1))
  return rankAPIReferenceResults(items, query, results, threshold)
}
