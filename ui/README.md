# UI Design System

This repository stores design assets for the Builder project.

This is a "Design Engineering System", not just a place to store design files.

By adopting the **Shift Left in Design** philosophy, we integrate design into the engineering workflow, making design assets versionable, reviewable, traceable, reusable, and automatically verifiable.

The goal is to enhance the team's **end-to-end iteration capability**, exposing issues during the design phase rather than fixing them after development or release.

## Directory Structure

```text
ui/
├── components/          # Reusable design components
│   └── spx/
│       └── builder-component.lib.pen
├── pages/               # Page designs
│   └── spx/
│       ├── community-*.pen
│       ├── *-editor.pen
│       └── tutorial.pen
├── docs/                # Documentation
├── images/              # Image assets
└── archive/             # Deprecated designs
```

## Quick Start

### For Designers

1. Component library: [`components/spx/builder-component.lib.pen`](components/spx/builder-component.lib.pen)
2. Create page designs in `pages/spx/`
3. Submit changes via PR

### For Developers

Page designs are in `pages/spx/`. Each `.pen` file corresponds to a feature or page.

## Documentation

| Document | Description |
| -------- | ----------- |
| [Team Workflow](docs/team-workflow.md) | Collaboration process |
| [AI Design Workflow](docs/ai-design-workflow.md) | Using AI to reproduce Figma designs |
| [PR Template](docs/pr-template.md) | PR title and description format |
| [Design Review Checklist](docs/design-review-checklist.md) | Pre-submission checklist |

## Workflow

```text
Issue → Design (.pen)
              │
              ├─ Simple → AI generates code → PR → Dev review & merge
              │
              └─ Complex → Design commit → Dev implements → Code PR
```

## File Naming

- Use kebab-case: `community-home.pen`
- Pages: `{feature-name}.pen`
