# UI Library for XBuilder

### Development

- Name component with prefix `UI`, e.g. `UIButton`

- Define simple & independent API for each component

  - The less customizability, the better
  - Prefer implementations without 3rd-party UI-library dependencies
  - If a component still needs an internal bridge to a 3rd-party tool, do not expose that tool's APIs or implementation details

- Provide each design token with two ways:

  1. Javascript values with context API
  2. CSS variables with prefix `--ui-`, e.g. `--ui-primary-color`

- Styling conventions

  - Prefer Tailwind utilities for local structure, layout, and surface styling
  - Local authored style blocks in the UI package use plain CSS; do not reintroduce SCSS
  - Keep complex selectors, animations, third-party/global overrides, and other readability-sensitive rules in plain CSS
  - The global CSS layer order is `theme, base, components, utilities` and is declared in the app HTML entries under `spx-gui/src/apps/*/index.html`

- Root class handling

  - Current cases mainly fall into two buckets: DOM-root components with merged utilities and single-root semantic wrappers that rely on inherited classes
  - If the root is a normal DOM element and the component already owns root utility classes, prefer an explicit `class?: ClassValue` prop and merge it with `cn(..., props.class)` so external root classes participate in `tailwind-merge`
  - Current modal wrapper `UIModal` follow this DOM-root pattern: external `class/style/data-*` land on the surface element, while backdrop behavior stays internal
  - If the component is a single-root wrapper whose styling still depends on semantic hook classes in `@layer components`, prefer Vue's default root attr/class/style inheritance unless explicit root attr control is needed
  - For all UI components, an external `class` can still be passed, but prefer explicit component props or a dedicated API extension for styling-critical behavior

### Usage

- Import from `@/components/ui`
- Prefer the component's explicit API over ad hoc external `class` overrides
