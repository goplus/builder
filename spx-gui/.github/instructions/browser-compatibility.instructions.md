---
applyTo: '**'
---

# Browser Compatibility

This document describes how we handle browser compatibility in the spx-gui project.

## Target Browsers

We specify target browsers via the `browserslist` field in `package.json`. This configuration is used by various tools to determine which browser features need transpilation or polyfilling. You can list the final set of supported browsers by running `npx browserslist` in the project root.

## Build-time Transpilation

Vite is configured to respect the `browserslist` configuration and transpile modern JavaScript/TypeScript syntax to code that runs in the target browsers. This handles syntax-level compatibility automatically during the build process.

## Runtime Feature Detection

We use `eslint-plugin-compat` to detect usage of JavaScript APIs that are not supported in our target browsers and require runtime polyfills. This ESLint plugin warns us when we use features like `Promise.allSettled`, `Array.prototype.at`, or other APIs that may not be available in older browsers.

## Adding Polyfills

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
