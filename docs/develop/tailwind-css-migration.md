# Tailwind CSS Migration Assessment for spx-gui

This document investigates whether XBuilder frontend styling in `spx-gui` should migrate to Tailwind CSS.

Issue: `goplus/builder#2981`

## Conclusion

Tailwind CSS is technically feasible in `spx-gui`, but a full migration is not a good near-term tradeoff.

The current frontend already has a working design-token layer, a custom UI component library, and deep integration with Naive UI theme overrides. Because of that, Tailwind would mainly change the authoring model for layout and simple component styling. It would not replace major parts of the existing styling system unless the project also commits to a broader UI-layer refactor.

The recommended direction is an incremental hybrid approach:

- keep the existing `--ui-*` design tokens and Naive UI theme layer
- add Tailwind only as an optional utility layer
- validate it on a small set of low-risk pages or self-contained components first
- only expand usage if the pilot materially improves development speed and code review quality

## Current Target

The current target is not "remove all SCSS from the repo".

The near-term goal is more specific:

- in business code outside `src/components/ui/`, use Tailwind as the default styling tool for local layout and surface styling
- if business code still needs local authored styles, prefer plain CSS over SCSS
- remove business-code imports of SCSS helpers from `src/components/ui/`
- remove remaining SCSS files outside `src/components/ui/` as part of this phase
- keep the existing design-system layer in `src/components/ui/` as the source of truth for tokens and Naive UI integration
- allow `src/components/ui/` to keep local SCSS for now when that remains the clearest implementation

This means the project is pursuing two related but different directions:

- business code should move toward Tailwind-first plus plain CSS fallback, with SCSS being removed from that layer in this phase
- the component-library layer should move more cautiously, with looser short-term requirements on SCSS removal

## Current Styling Architecture

The current frontend styling model is centered around Vue SFC local styles plus shared CSS variables, with Tailwind now added as an optional utility layer.

- `spx-gui` uses Vite + Vue 3, includes both Tailwind and Sass tooling in [spx-gui/package.json](../../spx-gui/package.json)
- the app loads global styling through [spx-gui/src/main.ts](../../spx-gui/src/main.ts) and [spx-gui/src/app.css](../../spx-gui/src/app.css), which keeps [spx-gui/src/components/ui/global.css](../../spx-gui/src/components/ui/global.css) as the base layer; Tailwind preflight is intentionally disabled, and the app imports only Tailwind theme and utilities layers
- design tokens are defined in TypeScript under [spx-gui/src/components/ui/tokens/index.ts](../../spx-gui/src/components/ui/tokens/index.ts) and related files
- the token objects are converted into `--ui-*` CSS variables and injected globally by [spx-gui/src/components/ui/UIConfigProvider.vue](../../spx-gui/src/components/ui/UIConfigProvider.vue)
- Naive UI theme overrides are also defined in [spx-gui/src/components/ui/UIConfigProvider.vue](../../spx-gui/src/components/ui/UIConfigProvider.vue), so the token system serves both custom CSS and third-party components
- most component styles live inside local `<style scoped lang="scss">` blocks, for example [spx-gui/src/components/ui/UIButton.vue](../../spx-gui/src/components/ui/UIButton.vue) and [spx-gui/src/components/editor/navbar/EditorNavbar.vue](../../spx-gui/src/components/editor/navbar/EditorNavbar.vue)

Measured footprint in `spx-gui/src`:

- 411 Vue files total
- 325 Vue files contain a `<style>` block
- 322 Vue files use SCSS in the SFC
- 115 `:deep(...)` usages override descendants or third-party internals
- 22 direct imports from `naive-ui`
- 5 standalone stylesheet files under `src`, with most styling still embedded in Vue SFCs

Representative styling patterns:

- token-driven custom components: [spx-gui/src/components/ui/UIButton.vue](../../spx-gui/src/components/ui/UIButton.vue)
- app-wide token and theme bridge: [spx-gui/src/components/ui/UIConfigProvider.vue](../../spx-gui/src/components/ui/UIConfigProvider.vue)
- responsive breakpoint logic: [spx-gui/src/components/ui/responsive.ts](../../spx-gui/src/components/ui/responsive.ts) and [spx-gui/src/components/community/CenteredWrapper.vue](../../spx-gui/src/components/community/CenteredWrapper.vue)
- complex page-level nested styling: [spx-gui/src/pages/community/project.vue](../../spx-gui/src/pages/community/project.vue)
- content-renderer deep selectors: [spx-gui/src/components/copilot/MarkdownView.vue](../../spx-gui/src/components/copilot/MarkdownView.vue)

## Tailwind Fit Assessment

Tailwind fits part of the project well, but not all of it.

Good fit:

- layout-heavy pages using flex, grid, spacing, width, and alignment utilities
- simple presentational components with limited state combinations
- new pages or isolated features where templates are already the main source of UI structure
- responsive layout rules, because the current breakpoint usage is limited and can be mapped into a custom Tailwind config

Weak fit:

- components with many styling states encoded through local CSS variables and nested selectors
- custom wrappers around Naive UI that rely on theme overrides plus `:deep(...)` selectors
- content renderers and editor surfaces that style generated DOM, not just authored template nodes
- components with runtime geometry or inline styles, such as sliders, image previews, waveform editors, or draggable/resizable panes

Poor or no fit:

- Monaco editor integration and other third-party DOM that already depends on custom CSS
- Konva or canvas-rendered surfaces where styling is not driven by CSS utility classes

## Migration Cost Estimate

Estimated cost if the goal is only to introduce Tailwind as an optional utility layer:

- setup and token mapping: 1 to 2 engineer-days
- pilot migration for 1 small feature area: 2 to 5 engineer-days
- documentation and team conventions: 1 engineer-day

Estimated cost for a meaningful incremental rollout across layout-heavy areas:

- 2 to 4 engineer-weeks
- includes Tailwind setup, token mapping, conventions, 10 to 20 component/page migrations, and cleanup of duplicated styling patterns

Estimated cost for a broad migration that tries to make Tailwind the dominant styling approach in `spx-gui`:

- 6 to 10 engineer-weeks at minimum
- likely more if the scope includes reworking Naive UI wrappers, complex editor surfaces, and duplicated `:deep(...)` customizations

Estimated cost for a true full migration away from the current SCSS-plus-token approach:

- high risk and not currently justified
- would effectively become a UI architecture refactor, not just a styling migration

## Major Risks And Constraints

### 1. Existing token system already solves part of the problem

The project already has a centralized token system and shared CSS variables. Tailwind would not replace that cleanly unless the team rewrites token consumption across both custom components and Naive UI overrides.

### 2. Tailwind does not remove the Naive UI dependency

Naive UI is embedded in the app theme model via [spx-gui/src/components/ui/UIConfigProvider.vue](../../spx-gui/src/components/ui/UIConfigProvider.vue). Even after adding Tailwind, the project would still need to maintain Naive UI theming and style overrides.

### 3. Scoped SCSS is currently aligned with component boundaries

A large share of the codebase keeps style logic close to each Vue component. Tailwind can improve speed for simple cases, but moving every component to class-heavy templates would be noisy and produce uneven code style if done inconsistently.

### 4. `:deep(...)` usage is a real migration brake

There are 115 `:deep(...)` usages. These target generated content, child internals, or third-party component markup. Tailwind utilities do not eliminate that category of styling work.

### 5. Complex editor UI gets limited value from utility classes

Several editor surfaces rely on runtime positions, inline CSS variables, drag behavior, SVG, or canvas-like rendering. Those areas already need custom CSS or programmatic styling, so Tailwind adds little leverage there.

### 6. Design consistency can regress during mixed migration

If the team starts using raw Tailwind classes without a token bridge and a small set of conventions, the result will drift away from the existing `--ui-*` design language.

### 7. Maintenance cost can increase before it decreases

During the transition, the project would have to maintain:

- scoped SCSS
- CSS variables
- Naive UI theme overrides
- Tailwind config and utilities

That is acceptable only if the migration remains intentionally narrow at first.

## Strategy Comparison

### Full Migration

Pros:

- one dominant styling model after the migration finishes
- potentially faster AI-assisted markup styling in the long run

Cons:

- high rewrite cost
- high risk of regressions in editor surfaces and custom UI components
- still does not remove the need for custom CSS in several critical areas
- poor short-term return on effort

Assessment: not recommended.

### Incremental Migration

Pros:

- low risk
- easy to stop if the benefits are smaller than expected
- preserves current design tokens and Naive UI integration
- lets the team learn where Tailwind actually helps

Cons:

- mixed styling models for some time
- requires discipline to avoid ad hoc utility usage

Assessment: viable.

### Hybrid Approach With Guardrails

This means Tailwind is introduced first where it improves business-code authoring, while the design-system layer keeps its current implementation patterns unless there is a clear payoff in changing them.

Recommended usage boundaries:

- use Tailwind for business-code page layout, spacing, simple cards, and simple wrappers
- in business code, prefer plain CSS over SCSS when Tailwind is not the right expression
- remove business-code dependencies on shared SCSS helper files from `src/components/ui/`
- remove remaining SCSS files outside `src/components/ui/` instead of carrying them forward as a second-tier target
- keep the existing token system as the source of truth
- allow `src/components/ui/` to keep local SCSS in the short term, especially where it wraps Naive UI, exposes component variants, or relies on local stateful styling
- keep CSS or SCSS for complex stateful widgets, `:deep(...)` overrides, editor internals, animation-heavy UI, and third-party DOM styling

Assessment: best option.

## Recommended Plan

### Phase 1: Proof Of Fit

- add Tailwind to `spx-gui` without changing existing styling
- map Tailwind theme values to the current `--ui-*` tokens where practical
- define custom breakpoints that match current responsive behavior
- document when Tailwind is allowed and when local SCSS should remain the default

Success criteria:

- build works cleanly with Vite
- no conflicts with current global styles or Naive UI theme overrides
- a pilot page can use Tailwind without introducing duplicated design values

### Phase 2: Pilot Migration

Choose one small, layout-oriented area first. Good candidates are community or tutorial pages, not the editor core.

Suggested pilot targets:

- [spx-gui/src/components/community/CenteredWrapper.vue](../../spx-gui/src/components/community/CenteredWrapper.vue)
- community listing or detail sections with mostly layout styling
- simple UI wrappers that do not depend heavily on `:deep(...)`

Avoid as first pilots:

- editor navbar and editor panels
- Monaco-related UI
- waveform, drag-and-drop, or resize-heavy components
- components that mainly customize Naive UI internals

Success criteria:

- the converted code is shorter or clearer than the current SCSS
- design stays visually identical
- AI-assisted edits become easier in practice, not just in theory

### Phase 3: Decide Whether To Expand

After the pilot, compare:

- implementation speed
- readability in code review
- consistency with existing design tokens
- regression rate
- amount of residual SCSS still required

If the pilot does not show a clear gain, stop and keep the current styling model.

If the pilot is successful, expand only into other layout-heavy areas.

## SCSS Migration Backlog

The current SCSS usage in `spx-gui` should not be treated as a single migration bucket.

The practical migration unit is not "all SCSS files" but "SCSS by responsibility":

- layout-heavy page and card styling is a good Tailwind candidate
- global foundation styling should remain, even if it later moves from SCSS to plain CSS
- deep overrides, generated content styling, and editor surfaces should remain in CSS or SCSS
- small SCSS helper layers should be phased out only after their consumers are migrated

### Priority 1: Good Tailwind Candidates

These files are strong candidates for early migration because they are business-code surfaces whose styling is mostly local layout, spacing, sizing, and simple visual presentation on authored template nodes.

Recommended first batch:

- [spx-gui/src/pages/community/explore.vue](../../spx-gui/src/pages/community/explore.vue)
- [spx-gui/src/pages/community/home.vue](../../spx-gui/src/pages/community/home.vue)
- [spx-gui/src/components/community/user/sidebar/UserSidebar.vue](../../spx-gui/src/components/community/user/sidebar/UserSidebar.vue)
- [spx-gui/src/pages/tutorials/course-series.vue](../../spx-gui/src/pages/tutorials/course-series.vue)

Recommended second batch:

- [spx-gui/src/components/navbar/NavbarWrapper.vue](../../spx-gui/src/components/navbar/NavbarWrapper.vue)
- [spx-gui/src/components/project/ProjectItem.vue](../../spx-gui/src/components/project/ProjectItem.vue)
- user-page wrappers and list pages under `src/pages/community/user/` where the styling is primarily page shell and list layout

Migration rule for this category:

- move layout, spacing, sizing, typography, and simple hover states into Tailwind classes or small project utilities in `src/app.css`
- if local authored styles still remain, prefer plain CSS over SCSS
- remove the local `<style scoped lang="scss">` block after the migrated component is visually verified

### Priority 2: Keep CSS Or SCSS Explicitly

These files should remain outside the primary Tailwind migration target because their value comes from deep selectors, third-party DOM overrides, generated content styling, complex runtime layout, or highly stateful design-system behavior.

Representative keep-as-CSS-or-SCSS areas:

- design-system wrappers such as [spx-gui/src/components/ui/UIButton.vue](../../spx-gui/src/components/ui/UIButton.vue) and [spx-gui/src/components/ui/UITextInput.vue](../../spx-gui/src/components/ui/UITextInput.vue)
- content renderers such as [spx-gui/src/components/copilot/MarkdownView.vue](../../spx-gui/src/components/copilot/MarkdownView.vue) and [spx-gui/src/components/common/CodeView.vue](../../spx-gui/src/components/common/CodeView.vue)
- editor and runner surfaces such as [spx-gui/src/components/editor/preview/EditorPreview.vue](../../spx-gui/src/components/editor/preview/EditorPreview.vue), [spx-gui/src/pages/community/project.vue](../../spx-gui/src/pages/community/project.vue), and components under `src/components/project/runner/` and `src/components/editor/`

Migration rule for this category:

- do not migrate these files just to reduce SCSS usage
- keep local CSS or SCSS where it is the clearest way to express stateful styling, `:deep(...)` overrides, pseudo-elements, counters, container queries, or generated DOM styling

### Priority 2.5: Remove Business-Code Dependencies On Shared SCSS Helpers

Business code should stop depending on shared SCSS helper files even if those helper files still temporarily exist for `src/components/ui/`.

Current remaining helper dependencies include:

- 2 direct imports of `src/components/ui/link.scss`

Migration rule for this category:

- replace `link.scss` usage with local CSS or template classes at the call site
- do not keep business-code SCSS imports just because the helper file still exists for another area

### Priority 2.6: Remove SCSS Files Outside `src/components/ui/`

This phase should not leave a second bucket of non-UI-library SCSS behind.

Migration rule for this category:

- for files outside `src/components/ui/`, convert remaining `<style lang="scss">` blocks to Tailwind or plain CSS in the same pass
- if a non-UI-library file still needs authored local styles after migration, keep them as plain CSS rather than SCSS
- reserve SCSS carryover for `src/components/ui/` only in this phase

### Priority 3: Phase Out Small SCSS Helper Layers

These files are not long-term migration targets themselves. They should be removed only after the remaining consumers are migrated or absorbed into component-local styles.

- [spx-gui/src/components/ui/link.scss](../../spx-gui/src/components/ui/link.scss)
	This should be folded into link components or replaced by a small Tailwind utility convention before deleting the mixin file.
- [spx-gui/src/utils/utils.scss](../../spx-gui/src/utils/utils.scss)
	This should be replaced by direct Tailwind utilities such as truncation helpers or by local component CSS where needed.

### Global Foundation Styling

Global foundation styling should remain even in a Tailwind-based hybrid model.

- [spx-gui/src/components/ui/global.css](../../spx-gui/src/components/ui/global.css) and its imported [spx-gui/src/components/ui/reset.css](../../spx-gui/src/components/ui/reset.css) should not be deleted as part of Tailwind adoption
- Tailwind preflight is intentionally disabled, so these files remain the project base layer for reset rules, `box-sizing`, button font inheritance, `@font-face`, and other shared foundation styles
- this base layer may evolve over time, but it should continue to live in project-owned CSS rather than being replaced implicitly by Tailwind preflight

### Recommended Execution Order

1. Finish low-risk page-shell and list-layout migrations in community and tutorials areas.
2. Migrate simple card components such as project and course list items.
3. Replace the remaining `link.scss` and `utils.scss` consumers.
4. Delete helper SCSS files only after they have no remaining imports or mixin usages.
5. Keep editor, runner, markdown, and Naive UI wrapper styling outside the migration scope unless there is a separate reason to refactor them.

## Pilot Conventions And Preferences

The community and tutorials pilot clarified a few practical conventions that should guide follow-up migrations.

These are not abstract preferences. They reflect patterns that were already implemented and verified in the pilot components and pages.

### 1. Keep Tailwind As A Local Authoring Tool, Not A New Global Dumping Ground

The global entry file [spx-gui/src/app.css](../../spx-gui/src/app.css) should stay narrowly scoped.

It is the right place for:

- Tailwind entry setup such as importing `tailwindcss/theme.css`, `tailwindcss/utilities.css`, and `@source`
- the theme bridge from existing `--ui-*` variables to Tailwind tokens
- rare project-wide utilities that are truly cross-feature and not page-specific

It is not the right place for:

- tutorials-only utilities
- page-local dimensions, transforms, or background colors
- feature-specific card or banner styles

Rule of thumb:

- if a class name would only make sense inside one page or one small feature area, keep it local to that component instead of promoting it into `app.css`

### 2. Bridge Global Tokens, Not Page-Specific Business Styling

The Tailwind theme bridge should cover stable design-system tokens from [spx-gui/src/components/ui/tokens/index.ts](../../spx-gui/src/components/ui/tokens/index.ts).

That includes:

- shared palette tokens
- semantic tokens such as `primary`, `danger`, `success`, `sprite`, `sound`, and `stage`
- typography, spacing, radius, and shadow tokens

It should not absorb page-specific visual decisions such as a tutorials-only banner color or one-off sizing tokens.

Rule of thumb:

- bridge values that belong to the whole product design language
- keep values that exist only for one feature in the feature itself

Theme-reset preference:

- for theme namespaces already covered by the design system, such as color, shadow, font, font-size, radius, and line-height, reset Tailwind's default values and expose only the project-specific values intended for use in this repo

Token usage preference:

- in Tailwind utility classes, prefer the bridged semantic tokens such as `text-text`, `text-title`, and `bg-primary-100`
- in local CSS or SCSS rules, prefer using the original `--ui-*` variables directly, because `--ui-*` remains the source of truth and the Tailwind bridge exists primarily for utility-class authoring

### 3. Prefer Tailwind For Straightforward Layout And Surface Styling

The pilot confirmed that Tailwind works well for the following kinds of changes:

- flex and grid layout
- spacing, width, height, alignment, and overflow
- simple typography application through bridged tokens
- simple hover transitions on authored template nodes

Representative examples from the pilot:

- [spx-gui/src/pages/tutorials/index.vue](../../spx-gui/src/pages/tutorials/index.vue)
- [spx-gui/src/components/tutorials/TutorialsBanner.vue](../../spx-gui/src/components/tutorials/TutorialsBanner.vue)
- [spx-gui/src/components/tutorials/CourseSeriesItem.vue](../../spx-gui/src/components/tutorials/CourseSeriesItem.vue)

Preferred style in this category:

- write the style directly in the template when the utilities remain readable
- remove the local style block after the result is verified

Responsive styling preference:

- reset Tailwind's default breakpoint names and use only the project-specific names `tablet`, `desktop`, and `desktop-large`
- map the project breakpoints into Tailwind once in [spx-gui/src/app.css](../../spx-gui/src/app.css)
- prefer Tailwind responsive variants for style changes instead of runtime `useResponsive()` checks
- keep runtime responsive helpers only for non-style logic such as changing counts, queries, or other behavior that CSS cannot express

### 4. Do Not Force Tailwind Where A Small Inline Style Is Clearer

Some values are technically expressible in Tailwind but are not a good fit for utility classes.

Examples from the pilot:

- special color expressions such as `rgb(from var(--ui-color-grey-1000) r g b / 0.2)`
- asset URLs that are clearer when imported through TypeScript
- one-off values that would otherwise require long arbitrary-value classes

Preferred style in this category:

- import the asset or compute the value in script when that makes the dependency explicit
- bind it through `:style` when the inline form is shorter and clearer than a custom utility or arbitrary class

This is the current preferred pattern for one-off backgrounds in migrated components such as [spx-gui/src/components/tutorials/CourseSeriesItem.vue](../../spx-gui/src/components/tutorials/CourseSeriesItem.vue).

### 5. Do Not Introduce Setup Variables For Single-Use Style Values Without A Payoff

During the pilot, a temporary setup variable was introduced for a single background image style and then removed.

Preferred style:

- if a style value is used only once and is still readable inline, bind it directly in the template
- only lift it into script when it is reused, computed, or meaningfully improves readability

### 6. Prefer Explicit Asset Imports Over Tailwind `url(...)` Classes When Readability Matters

Tailwind arbitrary `url(...)` classes do work correctly through Vite build and asset hashing.

However, the pilot showed that this form can still create review friction because the dependency path is less explicit in the template.

Preferred style:

- for important or non-obvious asset references, prefer `import stageBgUrl from '...'` plus `:style="{ backgroundImage: \`url(${stageBgUrl})\` }"`
- reserve Tailwind `bg-[url(...)]` for cases where the shorthand is clearly readable and unlikely to cause doubt

### 7. Keep Migration Decisions At The Responsibility Level, Not The File-Extension Level

The pilot reinforced the original migration strategy:

- Tailwind is a good fit for local page-shell and card layout concerns
- local CSS or SCSS should remain for deep selectors, generated content, third-party DOM overrides, and complex stateful widgets
- a file does not need to become "100% Tailwind" to count as successfully migrated

The goal is clearer and more maintainable code, not maximizing utility-class usage.

### 8. Keep Exact Local Values Local, With A Visible TODO

Some migrated components still need exact local visual values that are not part of the current token system.

Preferred style:

- keep those values local instead of forcing them into the global theme bridge
- add a nearby comment such as `TODO: review this ... value` so later cleanup can decide whether the value should remain local or become a token

## Recommendation

Tailwind CSS is worth evaluating in `spx-gui`, but only as a constrained utility layer.

It is not worth pursuing as a near-term full migration target because the project already has:

- a functioning token system
- a custom UI component layer
- Naive UI theme integration
- many component-local scoped SCSS blocks
- a meaningful number of deep selectors and complex editor surfaces

The practical recommendation for issue `#2981` is:

- conclude that Tailwind is feasible
- reject full migration for now
- recommend a hybrid incremental pilot
- make the pilot target a simple community or tutorial area before touching editor internals

## Suggested Next Step

If the team wants to continue after this assessment, the next task should be a small proof-of-concept PR that:

- installs Tailwind in `spx-gui`
- defines the minimal theme bridge to current tokens
- converts one low-risk page or wrapper component
- records what became simpler and what still required SCSS
