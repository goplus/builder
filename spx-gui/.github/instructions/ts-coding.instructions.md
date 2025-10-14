---
applyTo: '**/*.ts,**/*.vue'
---

Apply the [general coding guidelines](./general-coding.instructions.md) to all code.

Here are instructions for TypeScript development in spx-gui:

* Use `null` to represent the absence of a value. Avoid using `undefined`.

* Compare values with `null` with loose equality (`==` / `!=`) to check for absence.

	Avoid boolean checks like `if (value)` or `if (!value)` for null checks, as they can produce unexpected behavior with falsy values.

* Use strict equality (`===` / `!==`) for all other comparisons.

* Keep import statements in order:

	1. External libraries
	2. Internal libraries: from base to specific, e.g., from `utils` to `models` to `components`
	3. Local files: relative paths starting with `./` or `../`

* Use Prettier (`npx prettier --write <file>`) for code formatting after making changes.

* Use `PascalCase` for the following:
	- Class names
	- Interface names
	- Type alias names
	- Enum names and enum members
	- Vue component names
