# General Translation

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

English is the original language of the language-service content. Users who select English read the original. Users who select another language can request AI translation of a diagnostic or documentation description. After success, both translation and original are shown; while translation is pending or after failure, only the original is shown. Translation preserves the meaning, Markdown formatting, and code identifiers.

## Core Mechanism

### Translation Flow

After the user clicks “Translate,” the frontend extracts the relevant description and checks the cache using that text and its code or documentation context. On a miss, it asks the backend to translate. The backend checks authentication and limits, calls AI, and returns the translation.

### Translation Context

Only when the user clicks “Translate” for a diagnostic does the frontend read the line with the current diagnostic, limited to 1,000 Unicode characters. The code helps AI distinguish ordinary words from variable names, types, and other code identifiers.

Documentation translation may include the current definition overview, such as a type name or method signature, limited to 1,000 Unicode characters, to help AI identify what the description refers to.

The frontend supplies a `domain` to identify the content area. The backend selects corresponding controlled skill reference material. If `domain` is omitted, it uses general translation rules so the endpoint can also serve other content.

### Cache and Duplicate Requests

The frontend uses the existing query library to cache successful translations and coalesce identical concurrent requests. The cache key includes the current user, `content`, `targetLanguage`, `contentType`, `domain`, and `context`. A hit within 30 minutes is shown immediately; expired entries or changed inputs trigger a new request.

### Access and Usage

`POST /translations` is metered per user: at most 300 actual AI translations per 24 hours and 10 requests per minute.

### API Boundary

This feature adds `POST /translations` with these request fields:

* `content`: The English Markdown description extracted from the Hover, excluding the definition overview. It must not be blank and is limited to 10,000 Unicode characters.
* `targetLanguage`: The target language; currently only Simplified Chinese (`zh-CN`) is supported.
* `contentType`: `diagnostic` or `documentation`, used to select translation constraints.
* `domain`: An optional content-area identifier; this release uses `xgo` or `spx`. The backend selects controlled skill reference material accordingly, or general translation rules when omitted.
* `context`: An optional string. With `diagnostic`, it contains the line with the error; with `documentation`, the definition overview. It is only for disambiguation, not text to translate.

`content` and `context` are translation data. `translation` keeps the same Markdown formatting as `content` and translates only natural language. The JSON request body must not exceed 128 KiB.

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

Invalid fields, excessive field lengths, or an unsupported target language return `400`; a body over 128 KiB returns `413`. Exhausting the daily allowance returns `403`, and exceeding the per-minute rate returns `429`. AI unavailability or an unusable translation returns `503`; a timeout returns `504`.

## User Story

### Understand a Diagnostic

A user with a non-English language preference writes code with a type error. Hovering over the diagnostic first shows only the English original. After clicking “Translate,” the user can compare the translation with the original. Changing the code requires a new translation for a changed diagnostic.

### Read Documentation

A user with a non-English language preference hovers over a type or method and first sees the English documentation from the language service. After clicking “Translate,” the user can compare translation and original while the definition overview stays unchanged.
