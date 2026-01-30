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

### Code Formatting

* Use Prettier (`npx prettier --write <file>`) for code formatting after making changes.

### Naming Conventions

* Use `PascalCase` for the following:
	- Class names
	- Interface names
	- Type alias names
	- Enum names and enum members
	- Vue component names

## TypeScript Testing

* Use `describe` to group related tests.
* Check `src/utils/test.ts` for general utility functions.
* Check `src/models/project/index.test.ts` for examples of constructing mock `Project` instances.
* If test cases fail due to minor issues, fix them in the source code.
* If test cases fail due to complex reasons, leave the test case unchanged and add a comment explaining the issue.
* When running test cases, use the `--run` option to disable watch mode and get notified when tests finish. For example: `npm run test -- --run src/components/editor/editing.test.ts` runs tests in `editing.test.ts` in non-watch mode.
* It's OK to use type assertions like `as any` or `as unknown` to bypass type errors if you are sure of the types, but try to avoid them if possible.
* Avoid data sharing among test cases. Each test case should be independent and not rely on the state set by another test case.

## Vue Component Development

* Generate accessibility info for interactive elements using `v-radar` directive.

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
