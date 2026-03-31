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

* For business code outside `src/components/ui/`, prefer Tailwind as the default way to implement local layout and surface styling.
* If business code still needs local authored styles, prefer plain CSS over SCSS.
* Do not add or keep business-code imports of SCSS helpers from `src/components/ui/`.
* For `src/components/ui/`, the long-term direction is the same, but this phase still allows local SCSS where it remains the clearest implementation.
* Keep [src/app.css](src/app.css) limited to Tailwind entry setup, the theme bridge, and rare project-wide utilities.
* Tailwind preflight is intentionally disabled in `src/app.css`. Keep [src/components/ui/global.css](src/components/ui/global.css) and [src/components/ui/reset.css](src/components/ui/reset.css) as the project's base layer for reset and foundation styles.
* Do not move page-local or feature-local styles into `src/app.css` just because they are written with Tailwind.
* Keep page-specific dimensions, transforms, colors, and card/banner styling local to the relevant page or component.
* Keep the existing `--ui-*` design token system as the source of truth.
* In Tailwind utility classes, prefer the bridged semantic tokens such as `text-text`, `text-title`, and `bg-primary-100`.
* In local CSS or SCSS rules, prefer using the original `--ui-*` variables directly instead of routing those rules back through Tailwind bridge variables.
* For theme namespaces already covered by the design system, such as color, shadow, font, font-size, radius, and line-height, reset Tailwind's default values in `src/app.css` and expose only the project-specific values intended for use in this repo.
* Keep the project breakpoint mapping in `src/app.css` aligned with `src/components/ui/responsive.ts`.
* Reset Tailwind's default breakpoint names in `src/app.css` and use only the project-specific names `tablet`, `desktop`, and `desktop-large` in responsive classes.
* For responsive styling, prefer Tailwind responsive variants over runtime `useResponsive()` checks.
* Keep `useResponsive()` for non-style logic only, such as changing fetched counts or other runtime behavior that CSS cannot express.
* Prefer Tailwind for straightforward layout and surface styling: flex, grid, spacing, sizing, alignment, overflow, simple typography, and simple hover states.
* When Tailwind classes stay readable, write them directly in the template and remove the local style block after verification.
* Keep local CSS or SCSS for deep selectors, generated content, third-party DOM overrides, and complex stateful widgets.
* Do not force a file to become fully Tailwind if a small amount of local CSS or SCSS remains the clearest expression.
* Use `:style` for one-off values that are clearer inline than as Tailwind arbitrary values or custom utilities.
* For important or non-obvious background assets, prefer TypeScript imports plus inline `backgroundImage` binding over Tailwind `bg-[url(...)]` classes.
* Do not introduce setup variables for single-use style values unless they are reused, computed, or materially improve readability.
* When a non-token visual value needs to remain exact and local, keep it local instead of forcing it into the global token bridge. Add a nearby comment such as `TODO: review this ... value` so it is visible in later design cleanup or tokenization work.

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
