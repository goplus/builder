# Queries

Import query utilities from `@/utils/query`. Call the composables during component setup. Cached queries require the application's `VueQueryPlugin`.

## Query results

Both `useQuery` and `useQueryWithCache` return reactive `data`, `error`, `isLoading` and `progress`, plus `refetch()`.

- Data is null before a result is available; a successful result may itself be null or false. Use loading/error state rather than data truthiness to determine readiness.
- Errors exposed by either query helper are `ActionException` instances with a translatable `userMessage`. `failureSummaryMessage` supplies a contextual summary; without it, existing action exceptions are preserved and other errors receive a generic loading-failure summary while retaining their original cause.
- Pass the provided abort signal to asynchronous work so replaced requests and unmounted consumers can cancel it.

## Ordinary queries

`useQuery({ queryFn, failureSummaryMessage?, mode?, queryKey? })` runs automatically when reactive dependencies read synchronously by `queryFn` change, unless an explicit `queryKey` is provided. `refetch()` also starts a new request. Each request gets a context with `signal`, `source` (`auto` or `refetch`) and a progress `reporter`.

```ts
const query = useQuery({
  queryFn: async ({ signal }) => loadProject(owner.value, name.value, signal)
})
```

Each request sets loading to true while retaining the previous data/error. Success replaces data and clears the error; failure exposes an error and retains previous data. Replaced or aborted requests cannot publish late results. Ordinary queries do not share a cache. The optional `mode` field defaults to `'legacy'`, which preserves the behavior above and is available only to `useQuery`.

Both query hooks support these `QueryMode` values:

- `BackgroundRefresh`: keep the previous successful result and loading state during refresh; publish new data on success or retain data and expose the refresh error.
- `BlockingRefresh`: clear data/error and enter loading while awaiting a new result, including paused cached requests. Failure ends loading with null data and an error.
- `Snapshot`: retain the first valid success, including null/falsy data, until explicit refetch. Refetch clears the result and error and starts loading again. Snapshots also reset when their key changes. Ordinary snapshots without a key do not distinguish input identity changes; use a new instance or explicit refetch.

`useQuery` also accepts an optional `queryKey` array or reactive source, for example `{ queryKey: () => [seriesID.value], mode: QueryMode.Snapshot }`. Keys are compared by value using the same hash as cached queries. A changed key cancels the previous read, clears data/error and enters loading in every mode. With a key, ordinary reactive reads in `queryFn` are not collected; the key supplies its explicit inputs. This identifies the result only; ordinary queries still do not cache or share requests. Omitting the key preserves dependency-driven behavior, including identity-agnostic snapshots.

`composeQuery` can combine blocking child queries under a background or snapshot parent. The parent publishes a result only after all required children complete. Related cache entries must be invalidated together by store writes; this provides a coherent client result, not a server transaction snapshot.

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
| `QueryMode.BlockingRefresh`             | Clear data/error and enter loading on invalidation or refresh. Failure ends loading with null data and an error.                                                                                             |
| `QueryMode.Snapshot`                    | Wait for the first valid success for the current key, then retain the result and observable state despite shared-cache refreshes, writes, failures or invalidations.                                         |

Snapshot reads may immediately accept fresh successful cache hits. They wait for revalidation of expired or invalidated results, exposing null data/error and loading, including offline pauses. Failure exposes an error with null data and ends loading. Successful null/falsy values and empty collections count as results. Even with `staleTime: 0`, a successful fetch satisfies the current read; expiry alone does not hide a published result.

`BlockingRefresh` also hides invalidated optimistic values until revalidation completes. Expiry alone does not clear a published result; starting a refresh does.

Changing the key starts a new read. Explicit `refetch()` in snapshot mode immediately clears the consumer's data/error and enters loading. A snapshot refetch captures a new result on success; failure exposes an error with null data and can be retried. A canceled pending read starts or joins a replacement request instead of accepting restored old cache data. Key changes and unmounting stop the previous read from publishing results.

Use `backgroundRefresh` for continuous displays and mutation-driven state, and snapshot for initialization that must remain stable until the key changes or the consumer explicitly rereads. Background refresh keeps the current result available while a new result is fetched. All modes return reactive query state.

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

`composeQuery(ctx, query, subReportParams?)` reads another query inside `useQuery`, explicitly registers it as a dependency and aggregates progress. Registration also works after `await` and when the parent has an explicit key. Data/error/loading changes restart the parent; progress changes only update progress. Explicit refetch of the composed query also refetches its dependency once. The new read continues tracking dependencies, so subsequent changes restart an incomplete combination without repeating the explicit child refetch.

```ts
const session = useQuery({
  queryFn: async (ctx) => {
    const data = await composeQuery(ctx, query)
    return createSession(data, ctx.signal)
  }
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
