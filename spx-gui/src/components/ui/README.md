# UI Library for XBuilder

### Development

- Name component with prefix `UI`, e.g. `UIButton`

- Define simple & independent API for each component

  - The less customizability, the better
  - It is OK to implement with no 3rd-party dependencies
  - It is OK to have dependencies on 3rd-party tools like naive-ui internally

    When doing so, it is important for the component not to expose APIs or implementation details of 3rd-party tools

- Provide each design token with two ways:

  1. Javascript values with context API
  2. CSS variables with prefix `--ui-`, e.g. `--ui-primary-color`

### Usage

TODO.
