# UI Design Engineering System

This is a design engineering system, not just a directory for design files.

By introducing Shift Left in Design, design is integrated into the engineering workflow. Design assets become versionable, reviewable, traceable, reusable, and automatically verifiable. Designers deliver not only static design files, but also runnable and explorable prototypes that are easier for frontend engineers to migrate, making design outcomes closer to the final implementation instead of remaining static representations.

The goal is to improve the team's end-to-end iteration capability, so issues can be exposed during the design phase rather than after development or release.

## Directory Structure

```text
ui/
├── components/          # Reusable design components
│   └── spx/
│       └── builder-component.lib.pen
├── pages/               # Page-level Pencil design files
│   └── spx/
│       ├── community-*.pen
│       ├── editor-*.pen
│       └── tutorial.pen
├── prototype/           # Runnable frontend prototype
├── docs/                # Workflow, templates, and design guidelines
├── skills/              # AI agent task skills
├── images/              # Fonts, images, and design assets
└── tests/               # Design asset validation tests
    └── pen/
```

## Core Workflow

Current recommended workflow:

```text
Issue
  ↓
Design PR
  ↓
Code PR
```

- Issue: records the background, problem, expected outcome, and acceptance criteria.
- Design PR: submits Pencil file changes and `ui/prototype` changes, so the design and product behavior can be experienced in the prototype.
- Code PR: migrates styles and structure from the Design PR prototype, then completes the real business logic.

The same requirement should use one issue to connect the Design PR and Code PR.

## Prototype

`ui/prototype` is a runnable product prototype, not an isolated demo.

It is used during Design PR to express product behavior, page structure, visual design, and basic interactions. See [Prototype Agent Instructions](prototype/AGENTS.md) for detailed maintenance rules.

## Quick Start

### Designers

1. Use the component library: [`components/spx/builder-component.lib.pen`](components/spx/builder-component.lib.pen)
2. Maintain page-level Pencil files in `pages/spx/`.
3. Sync runnable page and interaction changes in `prototype/`.
4. Submit `.pen` and prototype changes through a Design PR.

### Developers

1. Read the requirement issue and Design PR.
2. Review `pages/spx/*.pen` to understand the design target.
3. Run `ui/prototype` to experience product behavior and visual changes.
4. Migrate styles and complete production business logic in the Code PR.

## Documentation

| Document | Description |
| -------- | ----------- |
| [Team Workflow](docs/team-workflow.md) | Current Issue → Design PR → Code PR workflow |
| [Team Workflow (Legacy)](docs/team-workflow-legacy.md) | Legacy workflow, kept for historical reference |
| [Issue Template](docs/issue-template.md) | Template for AI-generated GitHub issues |
| [PR Template](docs/pr-template.md) | Design PR title and description format |
| [Design Review Checklist](docs/design-review-checklist.md) | Pre-submission checklist |
| [Design Asset Validation](docs/design-asset-validation.md) | `.pen` design asset tests, component library snapshots, and Git hook notes |
| [Design to Code Mapping (Legacy)](docs/design-to-code-mapping-legacy.md) | Legacy `.pen` to `spx-gui` mapping rules |
| [Component Docs Naming](docs/component-docs-naming.md) | Component documentation naming conventions |
| [Prototype Agent Instructions](prototype/AGENTS.md) | Maintenance rules for `ui/prototype` |

## Tests and Validation

`ui/tests/pen/` contains design asset validation tests for protecting the component library and page-level Pencil files. See [Design Asset Validation](docs/design-asset-validation.md) for details.
