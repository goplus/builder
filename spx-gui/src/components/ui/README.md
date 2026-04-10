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

- Styling conventions

  - For most non-Naive UI components, prefer Tailwind utilities for local structure, layout, and surface styling
  - Local authored style blocks in the UI package use plain CSS; do not reintroduce SCSS
  - Keep complex selectors, animations, third-party/global overrides, and other readability-sensitive rules in plain CSS

- Root class handling

  - Current cases fall into three buckets: DOM-root components with merged utilities, single-root semantic wrappers that rely on inherited classes, and Naive UI-root wrappers whose final class priority can be harder to predict
  - If the root is a normal DOM element and the component already owns root utility classes, use `cn(..., attrs.class)` so external root classes are merged with `tailwind-merge`
  - If the component is a single-root wrapper whose styling still depends on semantic hook classes in `@layer components`, prefer Vue's default root attr/class/style inheritance unless explicit root attr control is needed
  - If the rendered root is primarily a Naive UI component, do not assume external root classes will override reliably. Naive UI's internal styles are not layered with our component styles, so their priority can be higher and the final visual result may be hard to predict
  - Current Naive UI-root components that need extra care are:

    - `UIDropdown` → `NPopover`
    - `UITooltip` → `NTooltip`
    - `UIModal` → `NModal`
    - `UIMessageProvider` → `NMessageProvider`
    - `UISlider` → `NSlider`
    - `UISwitch` → `NSwitch`
    - `UICheckbox` → `NCheckbox`
    - `UICheckboxGroup` → `NCheckboxGroup`
    - `UIRadio` → `NRadio`
    - `UIRadioGroup` → `NRadioGroup`
    - `UIForm` → `NForm`
    - `UITimeline` → `NTimeline`
    - `UITimelineItem` → `NTimelineItem`

  - For all UI components, an external `class` can still be passed, but do not rely on it for styling-critical behavior. Prefer an outer layout wrapper, explicit component props, or a dedicated API extension when finer control is needed
  - For the Naive UI-root components listed above, root-level visual overrides from an external `class` are especially hard to predict. Prefer an outer layout wrapper or Naive UI theme overrides instead of assuming the component root will restyle reliably
  - `UIDivider`, `UIFormItem`, `UILoading`, `UITextInput`, and `UINumberInput` also use Naive UI internally, but they expose a wrapper DOM root; external `class` lands on that wrapper instead of the inner Naive UI control
  - This is primarily a component authoring/maintenance concern. The long-term goal is to keep these wrappers easy to consume so business code does not need to carry much Naive UI-specific styling knowledge

### Usage

- Import from `@/components/ui`
- Prefer the component's explicit API over ad hoc external `class` overrides
