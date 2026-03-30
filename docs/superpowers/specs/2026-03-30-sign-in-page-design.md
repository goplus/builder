# Sign-In Page Design

- Date: 2026-03-30
- Status: Approved for planning
- Scope: `spx-gui`

## Summary

Implement the Figma domestic sign-in screen as the new first-party `/sign-in` page in `spx-gui`.
The page becomes the unified unauthenticated entry for routes and actions that require authentication.
Actual authentication continues to be handled by Casdoor.

The page provides three explicit entry points:

1. WeChat sign-in
2. QQ sign-in
3. Username/password sign-in via the existing Casdoor-hosted login page

The design must match the provided Figma screen closely on desktop, while degrading cleanly to a stacked mobile layout.
The implementation must use the existing Vue 3 + TypeScript + scoped SCSS stack and existing UI primitives where practical.
No Tailwind or parallel styling system will be introduced.

## Goals

- Add a real `/sign-in` page that matches the approved Figma design.
- Route unauthenticated users to `/sign-in` instead of redirecting straight to Casdoor.
- Preserve `returnTo` so users return to their intended in-app destination after sign-in.
- Keep the authentication backend flow unchanged by continuing to use Casdoor PKCE redirect flow.
- Support provider-specific WeChat and QQ entry points when configured.
- Degrade WeChat and QQ buttons to generic Casdoor login when provider-specific config is unavailable.

## Non-Goals

- Build a first-party username/password form inside `spx-gui`.
- Change the token exchange flow in `/sign-in/callback` beyond safe redirect validation and user feedback.
- Rework unrelated auth, navbar, or community page visuals outside the sign-in entry flow.
- Introduce Tailwind, CSS-in-JS, or a new component library.

## Context

Today, most sign-in entry points call `initiateSignIn()` directly and jump to Casdoor immediately.
The current app has a callback page at `/sign-in/callback` and a token sign-in page at `/sign-in/token`, but no branded sign-in landing page.

The approved Figma node is a desktop-first domestic login page with:

- A soft blue atmospheric background
- A centered white translucent panel with rounded corners and subtle shadow
- A left illustration area
- A right sign-in action panel with XBuilder branding
- Three sign-in actions

## Chosen Approach

Create a new `/sign-in` route and page.
Any sign-in-required flow in the app should send users to `/sign-in?returnTo=...`.
The new page owns presentation and user choice of sign-in method.
Once the user chooses a method, the page calls a store-level auth helper that redirects to Casdoor with the proper parameters.

This keeps authentication behavior centralized and reusable while making the user-facing experience align with the Figma design.

## User Experience

### Desktop

- The page fills the viewport.
- A soft, layered, blue background sits behind the content.
- A centered main card is rendered at desktop scale, targeting the Figma proportions:
  - Width: approximately `1000px`
  - Height: approximately `600px`
  - Two equal columns
  - Radius: `16px`
  - Subtle turquoise-tinted shadow
- Left side shows the illustration and page title.
- Right side shows the XBuilder logo, brand name, primary and secondary provider buttons, and the username/password entry text button.

### Mobile and Narrow Widths

- The page collapses into a single-column stacked layout.
- The sign-in panel is shown before the illustration.
- The main card width becomes fluid with safe viewport padding.
- The visual treatment remains branded, but layout prioritizes usability over strict desktop fidelity.

### Interaction Rules

- Clicking any login action puts that action into a short loading state and prevents duplicate submission.
- Username/password entry redirects to the generic Casdoor-hosted login.
- WeChat and QQ entry points try provider-specific redirect first, then fall back to generic Casdoor login when provider configuration is absent.

## Route and Navigation Design

## New Route

- Add `/sign-in`
- Component: `@/pages/sign-in/index.vue`
- This route does not require sign-in.

## Existing Routes

- Keep `/sign-in/callback`
- Keep `/sign-in/token`

## Already Signed-In Visitors

If a signed-in user navigates to `/sign-in` directly, the page should not remain visible.
It should immediately redirect to the normalized `returnTo` target when present, otherwise `/`.

## Redirect Flow

When an unauthenticated user attempts an action or route that requires authentication:

1. The app navigates to `/sign-in?returnTo=<encoded in-app path>`
2. The user chooses a sign-in method
3. The app redirects to Casdoor
4. Casdoor returns to `/sign-in/callback?returnTo=...`
5. The callback exchanges the code for tokens
6. The callback safely redirects to `returnTo`, or `/` if unavailable or unsafe

## Safe Redirect Rule

`returnTo` must only allow an internal application path.

Accepted:

- `/`
- `/editor/foo/bar`
- `/project/a/b?x=1`
- `/user/name#section`

Rejected and replaced with `/`:

- Absolute URLs such as `https://example.com`
- Protocol-relative URLs such as `//evil.com`
- Empty malformed values that do not begin with `/`

## Component Architecture

## Page Component

File:

- `spx-gui/src/pages/sign-in/index.vue`

Responsibilities:

- Read and normalize `returnTo`
- Set page title
- Bind click handlers for three sign-in actions
- Coordinate loading state
- Render the composed page

## Sign-In Panel Component

File:

- `spx-gui/src/components/sign-in/SignInPanel.vue`

Responsibilities:

- Render logo, brand name, provider buttons, and username/password entry action
- Emit `wechat`, `qq`, and `password` events
- Accept loading flags from parent
- Remain presentation-focused

## Sign-In Hero Component

File:

- `spx-gui/src/components/sign-in/SignInHero.vue`

Responsibilities:

- Render the left-side title and illustration
- Own only visual presentation

## Assets

The left illustration should be committed as a stable local asset under the sign-in page asset directory rather than reconstructed from many inline Figma fragments.

Planned location:

- `spx-gui/src/pages/sign-in/assets/`

This avoids brittle code, removes dependency on expiring remote Figma asset URLs, and preserves predictable rendering.

## Authentication Helper Design

Store-level auth helpers remain the single source of truth for redirect behavior.

Enhance the auth helper layer in or adjacent to:

- `spx-gui/src/stores/user/signed-in.ts`

Required public behaviors:

- Generic hosted login redirect
- WeChat login redirect with provider hint
- QQ login redirect with provider hint

Recommended helper API:

```ts
initiateSignIn(returnTo?: string, additionalParams?: Record<string, string>)
initiateWeChatSignIn(returnTo?: string)
initiateQQSignIn(returnTo?: string)
goToSignIn(returnTo?: string)
normalizeSafeReturnTo(input: string | null | undefined): string
```

`initiateSignIn` remains the base primitive.
Provider-specific helpers wrap it and inject the configured Casdoor parameters.

## Provider Configuration

Provider hint values must not be hardcoded inside the page component.
They should come from environment-backed config so deployment environments can vary safely.

Add optional environment variables:

- `VITE_CASDOOR_WECHAT_PROVIDER`
- `VITE_CASDOOR_QQ_PROVIDER`
- `VITE_CASDOOR_PROVIDER_PARAM_NAME`

Behavior:

- If both provider param name and provider value are present, use provider-specific redirect.
- If either is missing, fall back to generic `initiateSignIn(returnTo)`.

Default provider param name if unset:

- `provider`

This choice is explicit so the implementation is deterministic.
If the backend expects a different name in a future environment, deployment config can override it without code changes.

## Entry Point Changes

Existing user-visible sign-in entry points should navigate to the new page instead of calling Casdoor directly.

Priority targets:

- Global route guard behavior in `router.ts`
- Navbar sign-in button
- Any explicit "please sign in" CTA in community or project surfaces

Rule:

- If the user must choose a login method, navigate to `/sign-in`
- Do not redirect directly to Casdoor from ordinary UI buttons anymore

Exception:

- Low-level auth helpers remain available for the sign-in page and any special flows that intentionally bypass the chooser

## Visual Design Translation

## Styling System

- Use scoped SCSS
- Reuse existing CSS variables where they fit
- Add local page-level custom properties only for values not already represented in the shared UI theme

## Reuse of Existing UI Primitives

- Reuse `UIButton` for the main provider buttons
- Reuse `UIIcon` only when a matching icon already exists
- Use local SVG or image assets for WeChat and QQ icons if the current icon set does not include them

The login page may add wrapper classes around `UIButton` instances for width, radius, border, or typography alignment, but it must not change global button defaults in a way that affects unrelated pages.

## Fidelity Priorities

Priority order:

1. Layout and spacing
2. Button hierarchy and typography
3. Card surface and background atmosphere
4. Illustration fidelity
5. Micro-details that would require invasive global UI changes

## Accessibility

- Buttons must remain semantic `<button>` elements or equivalent accessible controls
- Visible focus states must be preserved
- Decorative illustration assets must use empty alt text
- The page title must remain text, not image
- Color contrast for text and buttons must remain at or above current accessible expectations

## Error Handling

## Sign-In Page

- If redirect initiation throws unexpectedly, show a user-facing error message and clear loading state
- If provider config is missing, silently degrade to generic hosted sign-in instead of surfacing an error

## Callback Page

- If token exchange fails, redirect to `/` after logging the error
- Before redirecting, validate `returnTo`
- If `returnTo` is unsafe, redirect to `/`

## Testing Strategy

Testing follows the repository's current `vitest` style, focused on behavior rather than screenshot snapshots.

## Required Tests

### Auth Helper Tests

- `normalizeSafeReturnTo` accepts valid internal paths
- `normalizeSafeReturnTo` rejects external or malformed paths
- `initiateWeChatSignIn` uses provider-specific params when configured
- `initiateQQSignIn` uses provider-specific params when configured
- Provider-specific helpers fall back to generic sign-in when config is missing

### Router / Navigation Tests

- Unauthenticated navigation that currently requires sign-in resolves to `/sign-in?returnTo=...`
- Navbar sign-in click routes to `/sign-in` rather than redirecting directly to Casdoor

### Page Behavior Tests

- Clicking each entry action triggers the expected helper
- Loading state prevents repeated clicks
- Username/password action uses generic hosted sign-in

## Manual Verification

- Compare desktop rendering against the provided Figma screenshot
- Verify button order, spacing, card proportions, and title placement
- Verify mobile stacking behavior
- Verify successful return to the original route after sign-in
- Verify fallback behavior when provider env vars are removed

## Rollout Notes

- The new `/sign-in` page should be introduced first
- Entry points should then be updated to route through it
- `/sign-in/token` remains available and unchanged for token-based sign-in flows

## Risks and Mitigations

### Risk: Casdoor provider hint parameter does not match deployment reality

Mitigation:

- Make parameter name and values environment-driven
- Fall back to generic hosted sign-in

### Risk: Existing direct sign-in flows bypass the new chooser

Mitigation:

- Update known entry points and guard paths in the same implementation
- Keep auth redirect logic centralized to avoid future drift

### Risk: Figma illustration is expensive to reproduce with inline vector markup

Mitigation:

- Use committed local asset export for the hero artwork

## Acceptance Criteria

- `/sign-in` exists and matches the approved Figma design closely on desktop
- The page is responsive and usable on narrow screens
- Unauthenticated entry flows go through `/sign-in`
- WeChat, QQ, and username/password actions all trigger a valid sign-in redirect
- Provider-specific actions degrade safely to generic sign-in when config is absent
- Post-login redirect returns users to a validated internal `returnTo`
- Automated tests cover redirect parameter generation and safe redirect normalization
