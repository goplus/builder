# AI Translation

AI Translation provides on-demand translation of dynamic descriptions in XBuilder, helping users understand code and content in their preferred language.

## Background

XBuilder's fixed interface already has multilingual text. Editor diagnostics change with code, library documentation includes descriptions in different languages, and translating UGC is a future direction. AI Translation provides a unified translation entry point for this content.

The editor already includes built-in Chinese and English descriptions for XGo's `for`, `if`, `var`, and `println`, and Spx's `Sprite`, `clone`, `onCloned`, and `turn`, among others. Existing descriptions in the target language are displayed directly; users can request translation of other content as needed.

## Goals

* Support diagnostic and documentation descriptions in code editor Hover in the first phase.
* Let users explicitly request translation, retain the original for comparison, and preserve its meaning.
* Select Context based on the description being translated to keep technical terms, code names, and formatting accurate.
* Continue the task when the user leaves the description, and reuse the task or translation when they return to the same description they previously clicked to translate.
* Extend to dynamic UGC such as project descriptions, instructions, and course introductions as reading needs evolve.

## Basic Concepts

### Description

* Diagnostic description: explains a problem in code and corresponds to the diagnostic's file and range.
* Documentation description: explains a definition such as a type or method, and comes from library documentation or user comments.

Each description has its own translation action. Diagnostics and documentation in the same Hover are handled separately.

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

### Language Assessment

The target language is the reader's current interface language. A new language analysis API automatically identifies languages in the actual text. Results are saved against the text version, and the frontend compares the language tags with the target language. The publisher's language settings are excluded from the identification criteria.

| Stage | Approach |
| - | - |
| Read | Use existing language information in built-in documentation, or query the language analysis result for the current text version |
| Identify | When no valid result exists, the language analysis service calls the model once to identify natural languages in the text; code, key names, and proper names are treated as protected content |
| Tag | Save the natural-language list and identification status; mixed languages are recorded as lists such as `[zh, en]`, with protected content excluded from the language tags |
| Reuse | Use the database and Redis for stable library descriptions and future public UGC, and frontend caching within the current page for diagnostics and user comments; concurrent analysis of the same version is merged into one task |
| Compare | Display the text directly when identification is complete and all languages match the target; offer a translation entry point when another language is present, identification is incomplete, or analysis fails |

For example, the text "按空格跳跃，avoid the enemies" is tagged `[zh, en]`, so both Chinese and English readers see a translation entry point. In "按 Space 跳跃", the key name is preserved and the natural language is tagged `[zh]`. Changing the target language only compares the tags again; updating the text triggers new analysis.

Language analysis is separate from translation generation after a click. For public UGC, language information is prepared after the text is saved or updated and delivered with the content when read. Editor descriptions are queried or analyzed as they are read. The system performs language analysis; uncertain results are treated as requiring translation, and users request a translation through the same entry point.

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

Translation storage and the user's display choice are managed separately. Within the same page session, descriptions the user has clicked retain the choice to view the translation. A new session or a change to the content or target language reassesses the entry point for the current content, and the user clicks again to view the translation.

### Translation Flow

1. The frontend determines the actual description, reads or identifies its language through the language analysis API, and compares it with the interface language. Uncertain results offer a translation entry point.
2. After the user clicks, the frontend collects the required Context, fixes the text, background, and target language, and forms an identity for the current input.
3. Query the translation or task for that input: return an existing translation directly, or continue waiting for an in-progress task.
4. When no result or task exists, request translation through the generation API. The server checks quota and request frequency, then submits the fixed input to the model once.
5. Validate the complete translation and save it in the frontend cache or a shared persistent record according to the content type. The frontend presents the result according to the current input and the user's display choice.

### Result Storage

The system saves language information and successful translations for reuse during later reading. Storage scope depends on the content type:

| Content | Storage and reuse rules |
| - | - |
| Diagnostics and user code comments | Cache language information, tasks, and translations within the current user's page |
| Existing built-in Chinese and English descriptions | Reuse existing documentation resources and read the target-language description directly |
| Stable public library descriptions with missing translations | Store persistently for users reading the same version with the same shared background |
| Public UGC such as project descriptions (future) | Store with the corresponding content for readers with the same target language |

#### Page Cache

When the user leaves Hover, translation continues and the result is saved. Returning to the same description they previously clicked lets them view the in-progress task or completed translation.

The page cache is subject to time and capacity limits. Refreshing the page or switching accounts clears personal results.

#### Public Content Storage

Each public description stores its current language information and one current translation per target language. Generating the same language again updates the existing translation; Chinese, English, and other language results are maintained separately.

When the text, relevant background, target language, and translation rules match, clicking reads the existing result directly. A missing valid translation triggers generation. Existing public translations are also viewed after an explicit user click.

### Translation Updates

A translation corresponds to the text, relevant background, and translation rules used during generation. The system checks these when the description is read again or the content is updated. Results matching the current content remain reusable.

#### Page Cache Updates

| Change | Handling rule |
| - | - |
| Diagnostic message or comment text changes | Automatically analyze the new text and display the current original with its corresponding translation entry point |
| The expression causing the error, relevant declarations, signature, or required background changes | Retain language information and match the translation again |
| Only line numbers move or unrelated code changes | Reuse the translation for the same text and background |
| Target language or translation rules change | Read the corresponding result; the user clicks to generate a missing valid translation |

After content changes, the user clicks to view the current translation. Completed results are displayed only in descriptions whose content matches their input.

#### Persistent Result Updates

Language information and translations for public descriptions are associated with the content version. Library descriptions are maintained with library and documentation versions; editing description text within the same library version also updates the corresponding content. Project descriptions and instructions are updated according to actual text changes, including when release information remains unchanged.

When the text changes, the system updates the current version and analyzes its language again, invalidating existing translations. Clicking "Translate" generates the current result and updates the existing translation for that target language. A change only to relevant background retains language information and matches the translation again.

Different library versions in use and different release objects maintain separate results. If content changes during generation, the current saved result follows the latest content version.

For example, when instructions change from "Press H to jump" to "Press J to jump", users see the new original and click to view a translation matching the new key.

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

A user opens Hover on a type error, reads the original, and clicks "Translate". The translation preserves variable names and types so the user can compare it with the original to understand the error.

While waiting, the user edits another file and the task continues. Returning to the same diagnostic shows its progress or completed translation. After changing the expression causing the error, the user sees the updated diagnostic and can click to translate the new content.

### Reading Library Documentation

A user views a Spx method. Existing Chinese documentation is displayed directly with a Chinese interface. For a library method without a Chinese description, the user clicks "Translate" and reads it alongside the original; signatures and code examples remain unchanged.

Returning to the description they previously clicked in the same page session reuses the translation. Other users reading the same trusted version of the public description first see the original and a translation entry point, then click to read the saved translation directly.

### Reading User Comments

A user views a custom method's comment and clicks "Translate". The translation corresponds to the comment text and uses the method's declaration and necessary background to resolve references. After the comment or related signature changes, the user sees the current original and clicks to read or generate the matching translation.
