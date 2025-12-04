# spx-gui

## Environment Requirements

- **Node.js**: >= 20.11.1
- **Go**: >= 1.24.0

## Install Dependencies

```bash
npm install
```

## Run the Project in Development Mode

```bash
npm run dev
```

## Development Standards

### Code Styles

#### Naming Convention

- For variables/functions/types: follow ESLint rule `@typescript-eslint/naming-convention`. For things "defining the shape" like class, interface, etc., use CamelCase. For "instances" like a regular variable, use camelCase.
- For filenames/folders: use CamelCase for Vue component files, use kebab-case for others.

#### Exports

- Use default export for Vue components. Use named export for all other cases.

#### Type Checks

- Do not ignore TypeScript errors. Try not to use `any`.
- Type Checks are run on PR (`vue-tsc`).

#### ESLint Rules

- ESLint rules can be ignored in some cases, but with Code Review.
- ESLint is run on PR.

#### Format

Use the NPM script `format` to format your code with Prettier:

```shell
npm run format
```

Format on PR for changed files is required. You can also turn on the feature Format on Save in VSCode.

### Component Standards

1. CamelCase naming
2. The order of tags is unified as `<script>, <template>, <style>`
3. Use the Composition API for coding
4. defineProps should use type declaration
5. Child components that are tightly coupled with the parent component should be prefixed with the parent component's name, e.g., SpriteList, SpriteListItem, SpriteListItemButton
