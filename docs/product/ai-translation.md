# AI Translation

AI Translation provides on-demand translation of dynamic descriptions in XBuilder, helping users understand code and content in their preferred language.

## Background

XBuilder's fixed interface already has multilingual text. Editor diagnostics change with code, library documentation includes descriptions in different languages, and translating UGC is a future direction. AI Translation provides a unified translation entry point for this content.

The editor already includes built-in Chinese and English descriptions for XGo's `for`, `if`, `var`, and `println`, and Spx's `Sprite`, `clone`, `onCloned`, and `turn`, among others.

## Goals

* Support diagnostic and documentation descriptions in code editor Hover in the first phase.
* Let users explicitly request translation, retain the original for comparison, and preserve its meaning.
* Select Context based on the description being translated to keep technical terms, code names, and formatting accurate.
* Let users continue editing and reading while waiting for translation.
* Extend to dynamic UGC such as project descriptions, instructions, and course introductions as reading needs evolve.

## Basic Concepts

### Description

* Diagnostic description: explains a problem in code and corresponds to the diagnostic's file and range.
* Documentation description: explains a definition such as a type or method, and comes from library documentation or user comments.

Translation processes the complete description, expressing mixed-language text in the target language while preserving meaning and coherence. Signatures, code identifiers, example code, numbers, links, and Markdown structure remain unchanged.

### Context

Context is the relevant background provided with a description. The frontend reads and selects it before requesting translation. Diagnostics are located by the reported error position, and documentation by its definition. Each request fixes the text and selected information.

#### Diagnostic Descriptions

| Required information | Read entry point |
| - | - |
| Diagnostic text and location | `Diagnostic.message` provides the text and `Diagnostic.range` provides the range; the file comes from the enclosing diagnostic data or Hover's `textDocument.id` |
| The expression causing the error and related code | `codeEditor.getTextDocument(id)` obtains the text document, then `textDocument.getValueInRange(range)` or `textDocument.getLineContent(line)` reads the code |
| Relevant declarations, types, and parameters | `codeEditor.lspClient.textDocumentDefinition` and `codeEditor.lspClient.textDocumentTypeDefinition` return declaration locations, whose code is then read through the text document |
| Relevant resource names and categories | `codeEditor.lspClient.getResourceReferences` returns resource references; the standalone function `getResourceModel(project, resourceId)` obtains the resource object |

Relevant declarations and resource information are added according to the diagnostic's content.

#### Documentation Descriptions

| Required information | Read entry point |
| - | - |
| Definition name, signature, and containing package or type | `DefinitionItem` already holds `overview` and `defId`; the standalone functions `parseDefinitionId` / `parseDefinitionName` parse the package name, definition name, and containing type |
| Description text and existing language versions | `codeEditor.documentBase.getDocumentation(defId)` reads library documentation; `DefinitionDetail`'s `childrenText` receives text from the language service |
| Declarations or implementation fragments relevant to user comments | `codeEditor.lspClient.textDocumentDefinition` returns declaration locations, then `textDocument.getValueInRange(range)` reads the source |

XGo / Spx knowledge for both types of translation is read through the standalone functions `getXGoLanguageSkillFiles()` and `getSpxProjectSkillFiles()`, exported by `utils/xgo` and `utils/spx`. Relevant material is selected according to the syntax and API involved.

## Core Mechanisms

### Language Analysis

The target language is the reader's current interface language.

| Stage | Approach |
| - | - |
| Read | The frontend first uses language information from built-in documentation, the page cache, or the content API; it requests the language analysis API when no valid information exists |
| Identify | When no valid result exists, the language analysis service calls the model once to identify natural languages in the text; code, key names, and proper names are treated as protected content |
| Tag | Save the natural-language list and identification status; mixed languages are recorded as lists such as `[zh, en]`, with protected content excluded from the language tags |
| Compare | Compare natural-language tags with the target language to determine whether all languages match, other languages are present, or the result is uncertain |

For example, the text "按空格跳跃，avoid the enemies" is tagged `[zh, en]`, so both Chinese and English readers see a translation entry point. In "按 Space 跳跃", the key name is preserved and the natural language is tagged `[zh]`.

Language analysis takes place at different times for the two content types:

* Public UGC: identify languages after the text is saved or updated, and return the language information with the text when users read it.
* Editor descriptions: query the text's language information when users view it, and identify languages when no valid result exists.

### Content Selection

Translation applies to the description text the user is currently reading, with the following display rules:

| Content state | Display rule |
| - | - |
| Built-in documentation already exists in the target language | Display that language version directly |
| All natural-language content is already in the target language | Display the text directly |
| The text contains description fragments in other languages | Display the original and a "Translate" entry point |
| A saved translation matches the current content | Display the original and a "Translate" entry point; read and display the translation after the user clicks |
| Content consists only of signatures, code, or empty text | Keep the existing display |
| Language analysis is in progress | Display the original and determine the translation entry point after analysis completes |
| Language analysis fails or the language is uncertain | Display the original and a "Translate" entry point |
| The user has clicked and is waiting for a translation | Retain the original and show an in-progress state |
| The translation is available after the user clicks | Display the translation with an AI Translation label and retain the original for comparison |

### API Design

Both APIs accept the content source, actual text, text format, and protected names. The translation API also accepts the target language and Context. The frontend provides diagnostic and comment text; the backend reads or verifies public content using its source identifiers.

| API | When called | Responsibility and output |
| - | - | - |
| `POST /translations/language-analysis` | Called automatically when valid language information is missing | Look up or identify languages and return the language list, identification status, and whether natural language is present, allowing the frontend to determine the translation entry point |
| `POST /translations` | Called after the user clicks Translate and the page lacks a reusable result | Look up an existing translation or wait for the same task; when generation is needed, check quota and request frequency, then call the model once, returning the complete translation |

### Translation Flow

1. The frontend reads or automatically identifies the text's languages and compares them with the interface language to determine the translation entry point.
2. After the user clicks, the frontend collects Context and first reuses a translation or task within the page. When no result exists, it calls the translation API for the backend to look up or generate a translation.
3. When generation completes, check the current input and public content version. Save validated results according to the content type and display translations matching the current description and target language.

### Result Storage

Language information stores languages and identification status for reuse across target languages. Translations store the complete text, target language, and the corresponding text, background, and rules used during generation.

| Content | Storage |
| - | - |
| Diagnostics, user comments, and translations containing personal code Context | The current user's page cache stores language information, tasks, and translations |
| Existing built-in Chinese and English descriptions | Reuse existing documentation resources |
| Stable public library descriptions and future public UGC | The database stores language information and successful translations, with Redis accelerating reads; share results with the same public background |

The page cache has expiration and capacity limits and is cleared when the page refreshes or the account changes. Tasks continue after the user leaves Hover; returning to the same description previously clicked shows progress or the translation.

Each public description retains one current text record and one translation record per target language. A new result in the same language overwrites its existing record. Missing or expired Redis entries are filled from valid database results.

### Translation Updates

Changes to the text, protected names, or language analysis rules trigger language identification again. Changes only to background, target language, or translation rules reuse language information.

#### Page Cache Updates

Reuse the editor's code change notifications and diagnostic refresh mechanism to read the description text and Context again. Add matching fingerprints for text, protected names, and Context to look up cached results for the same target language and translation rules.

When the description text or relevant Context changes, show the current original and require the user to click "Translate" again. Read a matching cache entry when available; otherwise, translate again. Moving line numbers or changing unrelated code keeps the existing translation.

#### Public Record Updates

| Content | Basis for updates |
| - | - |
| Public library descriptions | Reuse existing definition IDs and description reads; add a trusted documentation manifest, text and public background fingerprints, and a content version per entry to identify description edits within the same library version |
| Project descriptions and instructions (future) | Reuse change detection for `description` and `instructions` in `UpdateProjectParams.Diff`; add a content version for each field and update it when the text or required public background changes |

The project's `revision` signals that content should be checked again, while each field's content version determines whether its translation is valid. Different library versions or release objects maintain separate records.

A content version update invalidates old translations in all languages. The user must click "Translate" again to generate the current translation. A successful result overwrites that language's existing record and updates Redis. Other languages wait for generation on demand, and current content uses only cache entries matching its current version.

### Usage Quota

Translation reuses the existing quota and rate-limit mechanisms and is metered independently within the Free / Plus plans.

| Plan | Generation quota / 24 hours | Generation attempt limit / 1 minute |
| - | - | - |
| Free | 1000 | 30 |
| Plus | 5000 | 60 |

Each window starts at its first successful quota deduction. Subsequent requests keep the original expiration time. Quota is restored when the window expires, and the next request opens a new window. The minute allowance can be used in a burst. Translation and Copilot are counted separately; the system schedules and meters language analysis independently.

Counting rules:

| Action | Quota handling |
| - | - |
| View existing target-language documentation or a translation | Read directly and keep both window counters unchanged |
| Return to an in-progress translation or click the same task repeatedly | Reuse the task and keep the existing count |
| Generate a new translation | Deduct one generation allowance in advance and count one short-term attempt |
| Request a new translation after changing the original, relevant background, or target language | Count as a new task when no reusable result exists |

### Failure Handling

When translation fails, retain the original and explain the reason and next action.

| Situation | Handling |
| - | - |
| The 24-hour generation quota is exhausted | Indicate that the translation quota is used up and show the restoration time when available |
| The 1-minute generation attempt limit is reached | Indicate that requests are too frequent and show the waiting time when available |
| The model call fails, the server times out, or the translation is invalid | Indicate that translation failed and ask the user to retry manually |

While quota or rate limits apply, saved valid translations that remain accessible can still be viewed after a click. A retry matches translations or tasks against the current description again; a new generation is counted again when needed.

## User Stories

### Understanding a Diagnostic

A user encounters an English type error while writing code, clicks "Translate" in the diagnostic description, and fixes the code after understanding the cause.

### Reading Library Documentation

A user learning the Spx API encounters a method without a Chinese description and clicks "Translate" to understand its purpose and parameters.

### Reading User Comments

A user reading a method written by someone else clicks "Translate" to read a foreign-language comment and understand the code's intent.

### Reading UGC (Future)

A user browsing another creator's project clicks "Translate" to understand foreign-language or mixed-language project descriptions and instructions, learning what the project offers and how to play.
