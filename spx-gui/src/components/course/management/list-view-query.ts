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

  const readQuery = () => (typeof route.query.q === 'string' ? route.query.q : '')
  /** The search as typed, which filters the list at once and reaches the route once typing pauses. */
  const query = ref(readQuery())
  let lastWritten = query.value
  const writeQuery = debounce((q: string) => {
    if (q === readQuery()) return
    lastWritten = q
    replaceQuery({ q: q === '' ? undefined : q })
  }, 300)
  watch(query, writeQuery)
  onScopeDispose(() => writeQuery.cancel())
  // The search follows the route when it changes otherwise, as by a link to this page with another search; its own
  // write, landing after more typing, does not undo that typing.
  watch(readQuery, (q) => {
    if (q === lastWritten || q === query.value) return
    writeQuery.cancel()
    lastWritten = q
    query.value = q
  })

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
