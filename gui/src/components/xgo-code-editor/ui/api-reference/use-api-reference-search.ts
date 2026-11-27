import { debounce } from 'lodash'
import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { QueryMode, useQuery, type QueryRet } from '@/utils/query'
import { untilNotNull } from '@/utils/utils'
import type { APICategoryViewInfo, APIReferenceController } from '.'
import type { APIReferenceListData } from './APIReferenceListContent.vue'
import { groupItems } from './group-api-reference-items'

type SearchResult = APIReferenceListData & { query: string }

export type SearchState = QueryRet<SearchResult | null>

/**
 * Debounces the search term before loading and grouping provider results.
 * A null search state means the panel is browsing.
 */
export function useAPIReferenceSearch(
  getController: () => APIReferenceController,
  /** Categories with visible browsing items, in display order. */
  categories: Readonly<Ref<APICategoryViewInfo[]>>
) {
  const query = ref('')
  const submittedQuery = ref('')
  const result = useQuery<SearchResult | null>({
    mode: QueryMode.BlockingRefresh,
    queryFn: async ({ signal }) => {
      const term = submittedQuery.value
      if (term === '') return null

      const controller = getController()
      const items = controller.items ?? (await untilNotNull(() => controller.items, signal))
      signal.throwIfAborted()
      if (items.length === 0) return { query: term, groups: [], ungroupedItems: [] }

      const matches = await controller.search(items, term, signal)
      signal.throwIfAborted()
      return { ...groupItems(matches, categories.value, 'first'), query: term }
    }
  })
  const searchState = computed<SearchState | null>(() => (submittedQuery.value === '' ? null : result))

  const syncQuery = debounce((term: string) => {
    submittedQuery.value = term
  }, 300)

  watch(query, (value) => syncQuery(value.trim()), { flush: 'sync' })

  function submit() {
    const previousTerm = submittedQuery.value
    syncQuery.flush()
    if (previousTerm !== '' && submittedQuery.value === previousTerm && !result.isLoading.value) result.refetch()
  }

  function clear() {
    query.value = ''
    syncQuery.cancel()
    submittedQuery.value = ''
  }

  onBeforeUnmount(() => syncQuery.cancel())

  return { query, searchState, submit, clear }
}
