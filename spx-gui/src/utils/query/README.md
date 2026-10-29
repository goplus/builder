# Queries

Import query utilities from `@/utils/query`. Call the composables during component setup. Cached queries require the application's `VueQueryPlugin`.

## Query results

Both `useQuery` and `useQueryWithCache` return reactive `data`, `error`, `isLoading` and `progress`, plus `refetch()`.

- Data is null before a result is available; a successful result may itself be null or false. Use loading/error state rather than data truthiness to determine readiness.
- `failureSummaryMessage` wraps failures as action exceptions for user-facing error handling.
- Pass the provided abort signal to asynchronous work so replaced requests and unmounted consumers can cancel it.

## Ordinary queries

`useQuery(queryFn, failureSummaryMessage?)` runs automatically when reactive dependencies read synchronously by `queryFn` change. `refetch()` also starts a new request. Each request gets a context with `signal`, `source` (`auto` or `refetch`) and a progress `reporter`.

```ts
const query = useQuery(async ({ signal }) => {
  return loadProject(owner.value, name.value, signal)
})
```

Each request sets loading to true while retaining the previous data/error. Success replaces data and clears the error; failure exposes an error and retains previous data. Replaced or aborted requests cannot publish late results. Ordinary queries do not share a cache. Tutorial v2 also supports `clearResultOnFetch` to clear data/error before each ordinary query; this change does not alter that existing option.

## Cached queries

```ts
const query = useQueryWithCache({
  queryKey: () => ['project', owner.value, name.value],
  queryFn: (signal) => loadProject(owner.value, name.value, signal),
  staleTime: 60_000,
  mode: 'blocking'
})
```

`queryKey` accepts an array or a reactive source of an array. Include every identity that determines the result. Consumers sharing a key share cached data and requests. `staleTime` controls when cached data needs revalidation; it defaults to zero.

`mode` is local to each consumer and does not clear or freeze the shared cache:

| Mode                   | Refresh behavior                                                                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `background` (default) | Retain data and loading state during refresh. Success publishes new data; failure retains data and exposes the error. A cold request uses the underlying query's loading state.                             |
| `blocking`             | While awaiting a required result, expose null data/error and loading. Success publishes data and ends loading. Failure leaves data null, exposes the error and ends loading. Offline pauses remain loading. |
| `snapshot`             | Wait for the first valid success for the current key, then retain the result and observable state despite shared-cache refreshes, writes, failures or invalidations.                                        |

Blocking/snapshot reads may immediately accept fresh successful cache hits. They wait for revalidation of expired or invalidated results. Successful null/falsy values and empty collections count as results. Even with `staleTime: 0`, a successful fetch satisfies the current read; expiry alone does not hide a published result.

Changing the key starts a new read. Explicit `refetch()` in blocking/snapshot mode immediately clears the consumer's data/error and enters loading. A snapshot refetch captures a new result on success; failure exposes an error with null data and can be retried. Cancellation does not make the required result ready by restoring old cache data.

Use background for continuous displays and mutation-driven state, blocking when an operation must wait for the required result, and snapshot for initialization that must remain stable until the key changes or the consumer explicitly rereads.

## Reading and composing

`untilLoaded(query, signal?)` waits for the query's observable loading state to end, then returns its data or throws its error. It follows the selected mode: a background query can return its retained result during refresh. It does not independently require fresh cache data.

`composeQuery(ctx, query, subReportParams?)` reads another query inside `useQuery`, observes its data/error/loading updates, and aggregates progress. Explicit refetch of the composed query also refetches its dependency.

```ts
const session = useQuery(async (ctx) => {
  const data = await composeQuery(ctx, query)
  return createSession(data, ctx.signal)
})
```

## Cache writes

`useQueryCache<T>()` provides:

- `invalidate(queryKey)`: invalidate queries whose keys start with this prefix and refresh active queries.
- `invalidateWithOptimisticValue(queryKey, valueOrUpdater)`: write a known value to the exact key, or apply an updater to each existing non-null result matching the prefix, then invalidate matching queries to revalidate them. Updaters do not create missing cache entries. Older in-flight requests are canceled before writing so they cannot overwrite the new value.

Write cache data after mutations so background consumers reflect the change. A snapshot consumer keeps its accepted result until its key changes or it explicitly refetches.
