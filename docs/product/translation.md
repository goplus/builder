# Translation

XBuilder translates code diagnostics and documentation supplied by language services in the code editor into the user's selected language.

## Background

Diagnostics and documentation may still appear in English for users who prefer another language. Existing diagnostic translations based on matching the original text cannot cover messages that change with the user's code. This design uses AI translation of the English text returned by the language service.

## Goals

* Let non-English users read diagnostic and documentation descriptions in their chosen language.
* Use one translation capability for different kinds of language-service content, with only a few rules for each kind.
* Keep the original text available when translation fails, without blocking the editor.

## Scope

This release covers two kinds of language-service content in the code editor's Hover: diagnostic descriptions and documentation for definitions such as types and methods. Both start from the English original and are translated only when the user selects a non-English language. XBuilder currently supports English-to-Simplified-Chinese translation only.

Event descriptions retain their existing wording. Runtime terminal messages are out of scope.

## Concepts

### Diagnostic Description

A diagnostic description explains a problem in the code. Its text can change with the code, for example when an error includes a variable or type name.

### Documentation Description

Documentation supplied by the language service in a Hover describes a definition such as a type or method. It typically contains a definition overview followed by explanatory text, such as `type int` and a paragraph about the type, or a method signature and its description.

### Translation

English is the original language of the language-service content. Users who select English read the original. Users who select another language can request AI translation of a diagnostic or documentation description. Translation preserves the meaning and code identifiers without changing the definition overview, links, or other content outside the description.

### Translation and Original

When the user's language is English, only the original is shown. For a non-English language, the original is shown until the user clicks “Translate.” After success, both translation and original are shown. While translation is pending or after failure, only the original is shown.

## Core Mechanism

### Translation Flow

Diagnostic descriptions come from language-service diagnostics; documentation descriptions come from language-service Hover results. The frontend assembles both into the Hover shown to the user.

After the user clicks “Translate,” the frontend extracts the relevant description and checks the cache using that text and its code context. On a miss, it asks the backend to translate. The backend checks authentication and limits, calls AI, and returns the translation.

### Translation Context

Only when the user clicks “Translate” for a diagnostic does the frontend read the line with the current diagnostic and, when needed, up to two lines on either side. The excerpt is limited to five lines and 1,000 Unicode characters; truncation prioritizes the error line. It helps AI distinguish ordinary words from variable names, types, and other code identifiers. Documentation translation may include the current definition overview, such as a type name or method signature, limited to 500 Unicode characters.

The frontend supplies a `domain` to identify the content area. The backend selects corresponding controlled skill reference material. If `domain` is omitted, it uses general translation rules so the endpoint can also serve other content.

### Cache and Duplicate Requests

The frontend caches successful translations in the current signed-in session and coalesces identical concurrent requests. The cache key includes the complete values of `content`, `targetLanguage`, `contentType`, `domain`, and `context`. A translation is reused only for an exact match; changes to the code or definition overview cause a new request. Entries live for at most 30 minutes and are cleared on sign-out. Failures are not cached. A repeated click with a cached translation shows it immediately.

The existing HTTP client does not automatically cache identical `POST` requests. Translation calls must opt into application-level caching on the frontend. The first release does not require a separate server cache; its value can be assessed later from cache hit rates and AI cost.

### Access and Usage

`POST /translations` requires a signed-in user and has per-user limits separate from the Copilot allowance. The suggested initial limits are 300 actual AI translations per user per 24 hours and 10 requests per minute. A long editing session should usually involve only a few distinct, user-triggered translations per minute. Even an estimate of 20 translations per hour over a 10-hour day stays below the daily allowance. The limits should be adjusted after observing usage and cost.

Cache hits and clicks coalesced into one in-flight request do not consume additional daily AI allowance. Exhausting the daily allowance returns `403`; exceeding the per-minute rate returns `429`. The backend enforces both limits before calling AI so direct requests cannot bypass frontend caching.

### API Boundary

This feature adds `POST /translations` with these request fields:

* `content`: The English description extracted from the Hover, excluding the definition overview. It must not be blank and is limited to 12,000 Unicode characters.
* `targetLanguage`: The target language; currently only Simplified Chinese (`zh-CN`) is supported.
* `contentType`: `diagnostic` or `documentation`, used to select translation constraints.
* `domain`: An optional content-area identifier; this release uses `xgo` or `spx`. The backend selects controlled skill reference material accordingly, or general translation rules when omitted.
* `context`: An optional string. With `diagnostic`, it contains the nearby code; with `documentation`, the definition overview. It is only for disambiguation, not text to translate. One field avoids ambiguous combinations of `codeExcerpt` and `definition`. The client applies the 1,000- and 500-character limits above respectively, and the backend rejects requests that exceed the applicable limit.

Both `content` and `context` are user-supplied data and must never be treated as instructions when constructing the AI prompt. The returned `translation` is escaped and rendered as plain text, without interpreting HTML or links. Existing code identifiers and links remain in the original Hover content. The entire encoded JSON request body is limited to 128 KiB.

For example, translating a method's documentation uses this request and response:

```json
{
  "content": "SetDefaultKnowledgeBase sets the default knowledge base for AI players.",
  "targetLanguage": "zh-CN",
  "contentType": "documentation",
  "domain": "spx",
  "context": "func SetDefaultKnowledgeBase(kb map[string]any)"
}
```

```json
{
  "translation": "SetDefaultKnowledgeBase 设置 AI 玩家的默认知识库。"
}
```

A diagnostic translation uses this request and response:

```json
{
  "content": "opponent is not a type",
  "targetLanguage": "zh-CN",
  "contentType": "diagnostic",
  "domain": "spx",
  "context": "opponent ai.Player"
}
```

```json
{
  "translation": "opponent 不是一个类型。"
}
```

### Error Handling

Invalid fields, excessive field lengths, or an unsupported target language return `400`; an encoded body over 128 KiB returns `413`; unauthenticated requests return `401`. Exhausting the daily allowance returns `403`, and exceeding the per-minute rate returns `429`. AI unavailability or an unusable translation returns `503`; a timeout returns `504`. Limit responses should tell the client when it may retry.

The frontend keeps showing the original after any translation error. Diagnostics and documentation are translated independently, so failure of one does not affect the other.

## User Stories

### Understand a Diagnostic

A user with a non-English language preference writes code with a type error. Hovering over the diagnostic first shows only the English original. After clicking “Translate,” the user can compare the translation with the original. Changing the code requires a new translation for a changed diagnostic.

### Read Documentation

A user with a non-English language preference hovers over a type or method and first sees the English documentation from the language service. After clicking “Translate,” the user can compare translation and original while the definition overview stays unchanged.
