# Development Guidelines for spx-gui

This document provides development guidelines and coding standards for AI agents working on the spx-gui project.

## General Coding Guidelines

* Only add comments to explain the reasoning behind code decisions when the intent is not immediately clear from the code itself.

## TypeScript Development

### Null vs Undefined

* Use `null` to represent the absence of a value. Avoid using `undefined`.

* Compare values with `null` with loose equality (`==` / `!=`) to check for absence.

	Avoid boolean checks like `if (value)` or `if (!value)` for null checks, as they can produce unexpected behavior with falsy values.

* Use strict equality (`===` / `!==`) for all other comparisons.

### Import Order

Keep import statements in order:

1. External libraries
2. Internal libraries: from base to specific, e.g., from `utils` to `models` to `components`
3. Local files: relative paths starting with `./` or `../`

### Naming Conventions

* Use `PascalCase` for the following:
	- Class names
	- Interface names
	- Type alias names
	- Enum names and enum members
	- Vue component names

### Identifier Resolution

When working with backend unique string identifiers such as `username`, project owner, and project name, distinguish unresolved identifiers from canonical identifiers.

* Route params, query params, manual user input, and JWT-derived identifiers are unresolved unless the current task establishes a stronger guarantee.

* Backend-issued values from HTTP API responses are canonical.

* Prefer explicit unresolved names with an `Input` suffix.

* In models and resolved state, names like `owner`, `name`, and `username` should refer to canonical values.

* Keep normal strict and case-sensitive equality (`===` / `!==`) for consuming identifiers. Do not spread ad hoc case-normalization logic across comparison sites.

* Resolve unresolved identifiers at clear boundaries before consuming them. Typical resolution boundaries include project loading, user loading, and other backend-backed fetches.

* Avoid storing unresolved identifiers on long-lived models as if they were already canonical. Prefer passing unresolved identifiers as load or resolve parameters, then writing canonical values onto the model after resolution.

* Downstream logic should consume canonical values for behavior-sensitive checks such as ownership checks, permission checks, project reuse checks, and local-cache decisions.

* Cache keys and similar identity-scoping data may intentionally use unresolved identifiers when that preserves stable session scoping.

## TypeScript Testing

* Use `describe` to group related tests.
* Check `src/utils/test.ts` for general utility functions.
* Check `src/models/project/index.test.ts` for examples of constructing mock `Project` instances.
* If test cases fail due to minor issues, fix them in the source code.
* If test cases fail due to complex reasons, leave the test case unchanged and add a comment explaining the issue.
* When running test cases, use the `--run` option to disable watch mode and get notified when tests finish. For example: `npm run test -- --run src/components/editor/editing.test.ts` or `npx vitest --run src/components/editor/editing.test.ts` runs tests in `editing.test.ts` in non-watch mode.
* It's OK to use type assertions like `as any` or `as unknown` to bypass type errors if you are sure of the types, but try to avoid them if possible.
* Avoid data sharing among test cases. Each test case should be independent and not rely on the state set by another test case.

## Static Checks and Formatting

* `npm run type-check` runs TypeScript type checking.
* `npm run lint` runs ESLint.
* `npm run test` runs unit tests.
* Run the appropriate checks when making large changes and there are no pending TODOs that would cause static checks to fail.
* Use Prettier (`npx prettier --write <file>`) for code formatting after making changes.

## Vue Component Development

* Generate accessibility info for interactive elements using `v-radar` directive.

## Styling Preferences

### Defaults

* Use Tailwind as the default for local layout and surface styling.
* Keep styles local to the page/feature/component. Do not move local styles into `src/app.css`.
* Prefer readable template utilities and remove redundant local style blocks when they no longer improve clarity.
* Prefer direct template utilities over local `@apply` blocks when the styles are only used by one or two template nodes.
* If local authored styles are still needed, use plain CSS.

### Boundaries and Source of Truth

* Keep `src/app.css` limited to Tailwind entry setup, theme bridge, and rare project-wide utilities.
* Keep `src/components/ui/global.css` and `src/components/ui/reset.css` as the base reset/foundation layer (Tailwind preflight stays disabled).
* Keep `--ui-*` tokens as the source of truth.
* In Tailwind classes, prefer bridged semantic tokens (for example `text-text`, `text-title`, `bg-primary-100`).
* In local CSS, prefer direct `--ui-*` variables instead of bridged Tailwind variables.

### Responsive and Theme Rules

* Keep breakpoints in `src/app.css` aligned with `src/components/ui/responsive.ts`.
* Use only `tablet`, `desktop`, and `desktop-large` responsive names.
* Prefer responsive CSS/Tailwind variants over `useResponsive()`; keep `useResponsive()` for non-style runtime logic.
* Keep Tailwind theme namespaces reset to project tokens only (color, shadow, font, text, radius, etc.).

### When Local CSS Is Better

* Keep local CSS for `:deep(...)`, generated content, third-party DOM overrides, and complex stateful widgets.
* Keep a small local CSS rule for structural selectors that are awkward in template logic (for example nested `:last-child` rules) instead of encoding them with hard-to-read dynamic class expressions.
* Prefer plain local CSS over complex Tailwind descendant/arbitrary selectors for cross-component or slot-content styling.
* Preserve semantic hook classes used by parent selectors or slots (for example `.corner-menu`, `.course-item-mini`).
* For newly added components, avoid introducing `:deep(...)` selectors and cross-file hook classes when possible, since they increase maintenance cost.
* Do not force full Tailwind conversion when a small local style block is clearer.

### Practical Styling Notes

* Prefer standard Tailwind utility names when practical. For example, use `rounded-md` instead of a project-local alias like `rounded-2`; this keeps overrides more predictable because `tailwind-merge` understands standard utility groups better.
* For root-class overrides and utility conflicts:
	- For business components, external root `class` overrides are allowed by default. If utility conflicts need an explicit winner, prefer adding Tailwind's important modifier at the usage site (for example `rounded-md!`, `w-32!`) instead of expanding the component API. This keeps intent explicit, usage concise, and matches the fact that business components rarely need nested override chains.
	- For most UI components, `twMerge` and `@layer components` are set up so external utilities or custom classes can override root classes in the common case without special handling, though edge cases can still exist.
	- For the Naive UI-root components listed in `src/components/ui/README.md`, avoid relying on external `class` for styling-critical overrides when possible; the final result is often hard to predict.
* Avoid non-equivalent Tailwind simplifications for flex values. In particular, `flex: 1 1 0` is not equivalent to Tailwind `flex-1` (`flex: 1 1 0%`), so do not simplify between them unless the layout behavior has been verified. Likewise, do not simplify `flex: 0 0 auto` to `shrink-0`; use the equivalent `flex-none` when that shorthand is desired.
* Prefer `style` / `:style` for one-off values when clearer than Tailwind arbitrary utilities. For example, prefer `style="box-shadow: 0 24px 32px -16px rgba(0, 0, 0, 0.1)"` over a long arbitrary utility such as `shadow-[0_24px_32px_-16px_rgba(0,0,0,0.1)]`.
* For important/non-obvious background assets, prefer TS imports and inline `backgroundImage` binding.
* Keep fixed utility classes in `class`; reserve `:class` for stateful/dynamic parts only.
* In plain `<style scoped>`, flatten `:deep(...)` selectors (for example `.preview :deep(svg)`) so the final selector structure and specificity stay obvious.
* Do not use native CSS nesting in plain `<style>` / `<style scoped>` blocks; use flat selectors to avoid browser compatibility issues.
* Keep single-use values local; only add setup variables when reused/computed or clearly improving readability.

### Menu Item Text Guidelines

When creating or modifying menu items, follow these UI guidelines for ellipses:

**Use ellipsis (...)** when the action requires additional user input before completing (opens dialog/modal for input):
- "New project..." - Opens dialog for project details
- "Open project..." - Opens dialog to select project
- "Import project file..." - Opens file picker
- "Publish project..." - Opens dialog for settings
- "Remove project..." - Opens confirmation dialog

**No ellipsis** when the action executes immediately or only displays information:
- "Export project file" - Exports directly
- "Open project page" - Navigates directly
- "Profile", "Projects", "Sign out" - Direct actions
- "Language", "Manage sprites/sounds/backdrops" - Settings/info windows

Use `$t()` for i18n: `{{ $t({ en: 'New project...', zh: '新建项目...' }) }}`

Refs: [MS UX](https://learn.microsoft.com/en-us/windows/win32/uxguide/cmd-menus#using-ellipses), [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/menus#Labels)

## Browser Compatibility

This section describes how we handle browser compatibility in the spx-gui project.

### Target Browsers

We specify target browsers via the `browserslist` field in `package.json`. This configuration is used by various tools to determine which browser features need transpilation or polyfilling. You can list the final set of supported browsers by running `npx browserslist` in the project root.

### Build-time Transpilation

Vite is configured to respect the `browserslist` configuration and transpile modern JavaScript/TypeScript syntax to code that runs in the target browsers. This handles syntax-level compatibility automatically during the build process.

### Runtime Feature Detection

We use `eslint-plugin-compat` to detect usage of JavaScript APIs that are not supported in our target browsers and require runtime polyfills. This ESLint plugin warns us when we use features like `Promise.allSettled`, `Array.prototype.at`, or other APIs that may not be available in older browsers.

### Adding Polyfills

When `eslint-plugin-compat` reports an incompatible API usage, follow these steps:

1. **Install a polyfill library** that provides the missing feature (e.g., `core-js`, `scheduler`, or a feature-specific polyfill package).

2. **Import the polyfill in `src/polyfills.ts`**. This file serves as the central location for all runtime polyfills and is imported early in the application entry point.

3. **Configure ESLint to ignore the polyfilled feature** by adding it to the `settings.polyfills` array in `eslint.config.js`:

	```js
	{
		settings: {
			polyfills: ['featureName']
		}
	}
	```
