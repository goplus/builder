# API Reference search

The editor supplies the current provider's candidates, after stage/sprite and course whitelist filtering, to
`POST /api-reference-searches`. Candidate IDs include package, receiver and overload. Text contains the static
name, signature, and English/Chinese documentation; it never resolves project-specific snippet variables.
The backend owns embedding instructions, model/config versioning, per-text caching and cosine scoring.
Embedding inference requests Triton's binary FP32 output to reduce tensor response size and transfer time.
The public search endpoint continues to accept and return JSON. Transport changes do not alter model encoding
or require invalidating cached vectors; model/tokenizer/truncation changes still require a new encoding revision.

The frontend preserves direct name matches, then selects semantic scores at least `max(0.6, bestScore - 0.1)`.
Categories retain their original order; ranking applies within each secondary category. A shared candidate is
presented once. These scores are similarities, not probabilities. Service errors are shown separately from an
empty search, with local name matches retained.

## Relevance evaluation

Run the opt-in integration evaluation against a backend with sufficient evaluation rate limits:

```sh
cd gui
API_REFERENCE_SEARCH_URL=http://127.0.0.1:8081/api-reference-searches \
API_REFERENCE_SEARCH_REPORT=/tmp/api-reference-relevance.json \
pnpm exec vitest run tests/integration/api-reference-search.test.ts
```

The evaluation derives candidates from the actual `SpxAPIReferenceProvider`, checks 40 Chinese/English queries
and four unrelated queries, and reports full scores and timings. It is skipped without the endpoint variable;
ordinary tests use fixed vectors and fake services. Keep a separate validation set when changing thresholds.

On 2026-11-17, the existing Qwen3 embedding service returned each of the 40 expected API families within the
first five and retained them after the selection rule. All four unrelated queries selected no candidates.
The request-time median was 204 ms in this development network, mixing cached and new query embeddings;
this is not a cold-cache benchmark or an SLA. Similar methods can still rank ahead of the intended method,
so inspect the displayed groups and overloads when evaluating changes.

The development acceptance setup can proxy only `/api/api-reference-searches` to a local backend while
proxying other `/api` routes to staging. Put the more specific proxy rule first and verify the actual browser
request. A backend search harness with real Triton/Redis can exercise the search handler without PostgreSQL;
that does not validate unrelated full-server startup or database-dependent routes.

After switching the shared Triton embedder to binary FP32 output, the same 44-query evaluation was repeated
through the frontend development proxy. All 5632 candidate scores matched the saved JSON-output baseline
exactly. The production client measured 3.52 seconds for a 128-candidate cold-cache request in the same
development setup; this remains a small-sample observation, not a latency guarantee.
