# Issue Management

Use this guide when creating or updating an issue in `goplus/builder`. Set its priority, type, and applicable labels based on the information available. These fields answer different questions:

- **Priority:** How soon should we address the issue given what we know now?
- **Type:** What kind of work is the issue primarily about?
- **Labels:** Which product areas does it concern, and does it need further triage?

Use the issue description and relevant discussion to assess impact, workarounds, dependencies, and delivery commitments.

## Priority

Use the organization-level issue field **Priority** for the issue’s priority across `goplus/builder`.

| Priority | Meaning | Examples |
| --- | --- | --- |
| **Urgent** | Address immediately because waiting would cause ongoing, severe harm. | An active widespread outage, serious security incident, or ongoing data loss or corruption. |
| **High** | Prioritize for near-term work. | A core workflow is severely blocked, user work may be lost, or the issue blocks a confirmed near-term release. |
| **Medium** | Plan normally; the issue does not have High's immediate impact or delivery pressure. | A scoped defect, meaningful usability improvement, or agreed capability that is not blocking near-term delivery. |
| **Low** | Deferring has relatively little cost. | A minor visual detail, convenience improvement, or explicitly long-term exploration. |

Assess parent and child issues independently. If priority cannot be determined, leave it unset and add `needs:triage`.

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
| `area:admin` | Admin Console and management workflows spanning product areas. |
| `area:platform` | Shared data, storage, and foundational capabilities not limited to one product area. |
| `area:engineering` | CI, test infrastructure, development workflows, and engineering observability. |

Use these additional labels when applicable:

| Label | Meaning |
| --- | --- |
| `kind:tracking` | A long-term goal, collection, or parent tracker whose concrete work may be handled in child issues. Tracking issues are typically **Task**. |
| `needs:triage` | The issue needs clarification: for example, its status, remaining work, impact, or current direction is unclear. Remove this label after resolving the uncertainty. |

Use the issue type instead of adding `bug` or `enhancement` solely to repeat that information. Keep existing labels when they still convey useful information. Existing `spx-gui`, `spx-backend`, and `spx` labels may continue to indicate technical ownership. The existing `discuss` label does not automatically mean that the issue needs triage.

## XBuilder Daily Project

The [XBuilder Daily project](https://github.com/orgs/goplus/projects/6) tracks work that the team has assessed as worthwhile and intends to invest time and effort in. Maintainers can add issues they create directly when they meet this criterion. Issues from external contributors do not need to be added by default; add them after the team has assessed them and decided to pursue the work.

## Examples

These examples illustrate the rules; linked issues may have different classifications today:

- A parent issue tracking the Tutorial v2 release across child issues would typically be a **Task** with `area:tutorial` and `kind:tracking`.
- [#3644](https://github.com/goplus/builder/issues/3644): **High**, **Bug**, `area:tutorial` and `area:platform`. The reproduced cache failure blocks the Tutorial v2 release. Its discussion adds evidence beyond the original report.
- [#3578](https://github.com/goplus/builder/issues/3578): **Medium**, **Feature**, `area:editor`. Compact resource cards improve browsing in larger projects.
- [#3247](https://github.com/goplus/builder/issues/3247): **Low**, **Task**, `area:editor`. The work is an exploration of visual spacing.
- [#3488](https://github.com/goplus/builder/issues/3488): leave Priority unset and use `needs:triage` with `area:assets`. The publication requirement was later deferred in [#3498](https://github.com/goplus/builder/issues/3498), so its remaining direction needs clarification.

## Creating and Maintaining an Issue

When creating an issue, choose a Priority and Type, and add the relevant area labels and any applicable additional labels. If a field cannot be determined reliably, leave it unset, explain what needs clarification, and add `needs:triage`.

As discussion, evidence, or delivery plans evolve, update the issue and its fields to reflect what is currently known. Resolve outstanding questions and remove `needs:triage` when it is no longer needed. Existing fields and labels do not need to be changed unless there is a reason to update them.
