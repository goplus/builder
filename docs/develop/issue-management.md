# Issue Management

Use this guide when creating or updating an issue in `goplus/builder`. Set its priority, type, and applicable labels based on the information available. These fields answer different questions:

- **Priority:** How soon should we address the issue given what we know now?
- **Type:** What kind of work is the issue primarily about?
- **Labels:** Which product areas does it concern, and does it need further triage?

Use the issue description and relevant discussion to assess impact, workarounds, dependencies, and delivery commitments.

## Priority

Use the organization-level issue field **Priority** for the issue’s priority across `goplus/builder`.

The XBuilder Daily project also has a separate `P0`/`P1`/`P2` Priority field. That field can be used for ordering work within the project; it is not required when creating an issue and has no automatic mapping to the issue Priority. Set the issue Priority even if the issue is not in the project.

| Priority | Meaning | Examples |
| --- | --- | --- |
| **Urgent** | Address immediately because waiting would cause ongoing, severe harm. | An active widespread outage, serious security incident, or ongoing data loss or corruption. |
| **High** | Prioritize for near-term work. | A core workflow is severely blocked, user work may be lost, or the issue blocks a confirmed near-term release. |
| **Medium** | Plan normally; the issue does not have High's immediate impact or delivery pressure. | A scoped defect, meaningful usability improvement, or agreed capability that is not blocking near-term delivery. |
| **Low** | Deferring has relatively little cost. | A minor visual detail, convenience improvement, or explicitly long-term exploration. |

Consider severity, affected scope and frequency, available workarounds, and confirmed delivery constraints together. Effort, age, assignment, and implementation category alone do not determine priority. Potential harm is not the same as an active incident; reserve Urgent for issues that meet its threshold.

Assess parent and child issues independently. A high-priority initiative can contain lower-priority follow-ups, and a lower-priority initiative can contain a high-priority defect. Revisit priority when impact, evidence, or delivery plans change.

If there is not enough information to make a defensible decision, leave Priority unset and use `needs:triage`. Do not use Medium or Low to mean unknown.

## Type

Use one of the organization's existing issue types, based on the issue's primary objective:

| Type | Meaning |
| --- | --- |
| **Bug** | Fix existing behavior that is incorrect or does not meet expectations. An investigation into a specific failure can still be a Bug. |
| **Feature** | Add or extend a capability for users, course authors, or administrators, including a defined product experience improvement. |
| **Task** | Research, design, refactoring, documentation, testing, engineering maintenance, or tracking that is not primarily a specific defect or user-facing capability. |

Choose the primary objective rather than relying on words such as `fix`, `feat`, or “investigate” in the title. Leave the type unset and use `needs:triage` if the objective cannot be determined reliably.

## Labels

Area labels describe the product area primarily affected. Normally use one; use multiple when the issue meaningfully spans areas. Do not add a label just because an implementation happens to use a shared module.

| Label | Scope |
| --- | --- |
| `area:editor` | Project and resource editing, preview, and overall editor interaction. |
| `area:code-editor` | Code editing, diagnostics, completion, language servers, and API Reference. |
| `area:tutorial` | Courses, course authoring, learning flows, and the Tutorial Framework. |
| `area:copilot` | Copilot sessions, guidance, context, tools, and knowledge. |
| `area:assets` | Asset library, asset management, and AI asset generation. |
| `area:account` | Sign-in, identity, accounts, and authorization. |
| `area:community` | Community discovery, project presentation, profiles, and social features. |
| `area:runtime` | Project execution, SPX runtime behavior, and runtime integration. |
| `area:admin` | Admin Console and management workflows spanning business areas. |
| `area:platform` | Shared data, storage, and foundational capabilities not limited to one product area. |
| `area:engineering` | CI, test infrastructure, development workflows, and engineering observability. |

Use these additional labels when applicable:

| Label | Meaning |
| --- | --- |
| `kind:tracking` | A long-term goal, collection, or parent tracker whose concrete work may be handled in child issues. |
| `needs:triage` | The issue needs clarification: for example, its status, remaining work, impact, or current direction is unclear. Remove this label after resolving the uncertainty. |

Use the issue type instead of adding `bug` or `enhancement` solely to repeat that information. Keep existing labels when they still convey useful information. Existing `spx-gui`, `spx-backend`, and `spx` labels may continue to indicate technical ownership. The existing `discuss` label does not automatically mean that the issue needs triage.

## Examples

These examples illustrate the rules, not a permanent record of each issue's current classification:

- [#3590](https://github.com/goplus/builder/issues/3590): **High**, **Bug**, `area:account` and `area:tutorial`. The reported token refresh behavior can discard unsaved work; the issue describes diagnostics with mocked HTTP responses, not a measured production frequency.
- [#3644](https://github.com/goplus/builder/issues/3644): **High**, **Bug**, `area:tutorial` and `area:platform`. The reproduced cache failure blocks the Tutorial v2 release. Its discussion adds evidence beyond the original report.
- [#3578](https://github.com/goplus/builder/issues/3578): **Medium**, **Feature**, `area:editor`. Compact resource cards improve browsing in larger projects.
- [#3247](https://github.com/goplus/builder/issues/3247): **Low**, **Task**, `area:editor`. The work is an exploration of visual spacing.
- [#3488](https://github.com/goplus/builder/issues/3488): leave Priority unset and use `needs:triage` with `area:assets`. The publication requirement was later deferred in [#3498](https://github.com/goplus/builder/issues/3498), so its remaining direction needs clarification.

## Creating and maintaining an issue

When creating an issue, choose a Priority and Type, and add the relevant area labels and any applicable additional labels. If a field cannot be determined reliably, leave it unset, explain what needs clarification, and add `needs:triage`.

As discussion, evidence, or delivery plans evolve, update the issue and its fields to reflect what is currently known. Resolve outstanding questions and remove `needs:triage` when it is no longer needed. Existing fields and labels do not need to be changed unless there is a reason to update them.
