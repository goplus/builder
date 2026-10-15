import { debounce } from 'lodash'
import { computed, onScopeDispose, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import type { ListSortBy } from './list-view'

/**
 * The search and the sort of a list, kept in the route query (`q` and `sort`) so that coming back to the list finds it
 * as it was left. Writing them replaces the history entry instead of adding one for each key typed.
 */
export function useListViewQuery() {
  const route = useRoute()
  const router = useRouter()
  // Changes are written to this page's route only, not to one navigated to before a pending write runs.
  const path = route.path

  function replaceQuery(query: LocationQueryRaw) {
    router.replace({ path, query: { ...route.query, ...query } })
  }

  /** The search as typed, which filters the list at once and reaches the route once typing pauses. */
  const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
  const writeQuery = debounce((q: string) => replaceQuery({ q: q === '' ? undefined : q }), 300)
  watch(query, writeQuery)
  onScopeDispose(() => writeQuery.cancel())

  const sortBy = computed<ListSortBy>({
    get() {
      const sort = route.query.sort
      return sort === 'title' || sort === 'updatedAt' ? sort : 'order'
    },
    set(sort) {
      replaceQuery({ sort: sort === 'order' ? undefined : sort })
    }
  })

  return { query, sortBy }
}
