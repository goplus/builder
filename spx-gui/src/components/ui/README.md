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
  - The global CSS layer order is `theme, base, naive-ui, components, utilities` and is declared in `spx-gui/index.html`

- Root class handling

  - Current cases fall into three buckets: DOM-root components with merged utilities, single-root semantic wrappers that rely on inherited classes, and Naive UI-root wrappers whose root-level styling behavior still needs component-specific judgment
  - If the root is a normal DOM element and the component already owns root utility classes, prefer an explicit `class?: ClassValue` prop and merge it with `cn(..., props.class)` so external root classes participate in `tailwind-merge`
  - Current modal wrappers such as `UIModal` and `UIFullScreenModal` follow this DOM-root pattern: external `class/style/data-*` land on the surface element, while backdrop behavior stays internal
  - If the component is a single-root wrapper whose styling still depends on semantic hook classes in `@layer components`, prefer Vue's default root attr/class/style inheritance unless explicit root attr control is needed
  - If the rendered root is primarily a Naive UI component, remember that Naive UI styles live in the `naive-ui` layer while our authored UI styles live in `@layer components`, so component-layer rules have higher cascade priority than Naive UI defaults on the same element/property pair
  - Even so, Naive UI-root components still do not behave exactly like DOM-root utility wrappers: some visual details live on internal child nodes, teleported content, or Naive UI theme tokens instead of the exposed root element
  - Current Naive UI-root components that need extra care are:

    - `UIMessageProvider` → `NMessageProvider`
    - `UISlider` → `NSlider`
    - `UISwitch` → `NSwitch`
    - `UICheckbox` → `NCheckbox`
    - `UICheckboxGroup` → `NCheckboxGroup`
    - `UIRadio` → `NRadio`
    - `UIRadioGroup` → `NRadioGroup`
    - `UIForm` → `NForm`
    - `UITextInput` → `NInput`
    - `UINumberInput` → `NInputNumber`
    - `UITimeline` → `NTimeline`
    - `UITimelineItem` → `NTimelineItem`

  - For all UI components, an external `class` can still be passed, but prefer explicit component props or a dedicated API extension for styling-critical behavior
  - For the Naive UI-root components listed above, simple root-level overrides are generally workable because the `components` layer sits above `naive-ui`, but do not assume every visual change should come from the root `class`. For deeper visual changes, prefer an outer layout wrapper, explicit props, or Naive UI theme overrides
  - `UIDivider`, `UIFormItem`, and `UILoading` also use Naive UI internally, but they expose a wrapper DOM root; external `class` lands on that wrapper instead of the inner Naive UI control
  - This is primarily a component authoring/maintenance concern. The long-term goal is to keep these wrappers easy to consume so business code does not need to carry much Naive UI-specific styling knowledge

### Usage

- Import from `@/components/ui`
- Prefer the component's explicit API over ad hoc external `class` overrides
