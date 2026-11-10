# Queries

Import query utilities from `@/utils/query`. Call the composables during component setup. Cached queries require the application's `VueQueryPlugin`.

## Query results

Both `useQuery` and `useQueryWithCache` return reactive `data`, `error`, `isLoading` and `progress`, plus `refetch()`.

- Data is null before a result is available; a successful result may itself be null or false. Use loading/error state rather than data truthiness to determine readiness.
- Errors exposed by either query helper are `ActionException` instances with a translatable `userMessage`. `failureSummaryMessage` supplies a contextual summary; without it, existing action exceptions are preserved and other errors receive a generic loading-failure summary while retaining their original cause.
- Pass the provided abort signal to asynchronous work so replaced requests and unmounted consumers can cancel it.

## Ordinary queries

`useQuery(queryFn, failureSummaryMessage?, options?)` runs automatically when reactive dependencies read synchronously by `queryFn` change. `refetch()` also starts a new request. Each request gets a context with `signal`, `source` (`auto` or `refetch`) and a progress `reporter`.

```ts
const query = useQuery(async ({ signal }) => {
  return loadProject(owner.value, name.value, signal)
})
```

Each request sets loading to true while retaining the previous data/error. Success replaces data and clears the error; failure exposes an error and retains previous data. Replaced or aborted requests cannot publish late results. Ordinary queries do not share a cache. The optional third argument accepts `{ clearResultOnFetch: true }` to clear data/error before each request; it defaults to false.

## Cached queries

```ts
import { QueryMode, useQueryWithCache } from '@/utils/query'

const query = useQueryWithCache({
  queryKey: () => ['project', owner.value, name.value],
  queryFn: (signal) => loadProject(owner.value, name.value, signal),
  staleTime: 60_000,
  mode: QueryMode.Snapshot
})
```

`queryKey` accepts an array or a reactive source of an array. Include every identity that determines the result. Consumers sharing a key share cached data and requests. `staleTime` controls when cached data needs revalidation; it defaults to zero.

`mode` is local to each consumer and does not clear or freeze the shared cache:

| Mode                                    | Refresh behavior                                                                                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `QueryMode.BackgroundRefresh` (default) | Follow shared-cache results. Retain data and loading state during refresh. Success publishes new data; failure retains data and exposes the error. A cold request uses the underlying query's loading state. |
| `QueryMode.Snapshot`                    | Wait for the first valid success for the current key, then retain the result and observable state despite shared-cache refreshes, writes, failures or invalidations.                                         |

Snapshot reads may immediately accept fresh successful cache hits. They wait for revalidation of expired or invalidated results, exposing null data/error and loading, including offline pauses. Failure exposes an error with null data and ends loading. Successful null/falsy values and empty collections count as results. Even with `staleTime: 0`, a successful fetch satisfies the current read; expiry alone does not hide a published result.

`blockingRefresh` is reserved for a future mode that clears the consumer's result while waiting for a refreshed result; it is not currently supported.

Changing the key starts a new read. Explicit `refetch()` in snapshot mode immediately clears the consumer's data/error and enters loading. A snapshot refetch captures a new result on success; failure exposes an error with null data and can be retried. A canceled pending read starts or joins a replacement request instead of accepting restored old cache data. Key changes and unmounting stop the previous read from publishing results.

Use `backgroundRefresh` for continuous displays and mutation-driven state, and snapshot for initialization that must remain stable until the key changes or the consumer explicitly rereads. Background refresh keeps the current result available while a new result is fetched. Both modes return reactive query state.

Business store hooks accept an options object, for example `useSeries(seriesID, { mode: QueryMode.Snapshot })`. Omitting the options or mode uses `backgroundRefresh` behavior.

## Paged queries

```ts
const query = useInfiniteQueryWithCache({
  queryKey: () => ['notifications', category.value],
  queryFn: (pageToken, signal) => listNotifications({ category: category.value, pageToken }, signal),
  getNextPageToken: (page) => page.nextPageToken
})
```

`useInfiniteQueryWithCache` loads a cached list page by page. `queryFn` receives `null` as the token of the first page, and `getNextPageToken` returns `null` when there are no more pages. Data is the list of loaded pages.

It always behaves like `QueryMode.BackgroundRefresh` and has no `mode` option. `refetch()` and cache invalidation refetch all loaded pages, retaining them until the refetch succeeds; failure retains them and exposes the error.

`fetchNextPage()` loads the next page if `hasNextPage` is true. It does nothing while the query is fetching, so it can be called on every scroll event without restarting a pending request. `isFetchingNextPage` is true only while the next page loads.

## Reading and composing

`untilLoaded(query, signal?)` waits for the query's observable loading state to end, then returns its data or throws its error. It follows the selected mode: a `backgroundRefresh` query can return its retained result during refresh. It does not independently require fresh cache data.

`composeQuery(ctx, query, subReportParams?)` reads another query inside `useQuery`, observes its data/error/loading updates, and aggregates progress. Explicit refetch of the composed query also refetches its dependency.

```ts
const session = useQuery(async (ctx) => {
  const data = await composeQuery(ctx, query)
  return createSession(data, ctx.signal)
})
```

## Cache writes

`useQueryCache()` provides:

- `invalidate(queryKey)`: invalidate queries whose keys start with this prefix and refresh active queries.
- `invalidateWithOptimisticValue(queryKey, value)`: write a known value to the exact key, creating the entry if missing, then invalidate and revalidate only that entry.
- `invalidateMatchingWithOptimisticUpdater(queryKeyPrefix, updater)`: apply an updater to each existing non-null result matching the prefix, then invalidate matching queries and refresh active matches. It does not create missing cache entries.

Both optimistic methods cancel older matching in-flight requests before writing so they cannot overwrite the new values.

The methods are generic per call, so one cache instance can handle different data types. Values infer their type; updater calls can specify it explicitly, for example `cache.invalidateMatchingWithOptimisticUpdater<ByPage<Course>>(prefix, updater)`.

Write cache data after mutations so `backgroundRefresh` consumers reflect the change. A snapshot consumer keeps its accepted result until its key changes or it explicitly refetches.
