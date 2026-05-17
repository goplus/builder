# Prototype Full Frontend Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `ui/prototype` structurally mirror all current `spx-gui` page and widget surfaces while remaining a standalone offline prototype.

**Architecture:** Use page-first synchronization from `spx-gui/src/pages` and `spx-gui/src/widgets`, then adapt only the presentation and basic interaction layer into `ui/prototype`. Replace auth, backend APIs, cloud persistence, docs API loading, editor internals, and widgets with local deterministic mock modules and local state.

**Tech Stack:** Vite, Vue 3, Vue Router, TypeScript, Tailwind CSS v4, local mock APIs, local static assets, `scripts/check-prototype.mjs`.

---

## File Structure

Create or modify these prototype-owned files:

- Modify: `prototype/scripts/check-prototype.mjs` - contract checks for full route/page/widget coverage and offline boundaries.
- Modify: `prototype/src/router.ts` - route tree aligned with `spx-gui/src/router.ts`.
- Modify: `prototype/src/data/mock.ts` - shared mock data for users, projects, courses, docs, editor, widgets.
- Modify: `prototype/src/apis/community.ts` - local community/user query helpers.
- Modify: `prototype/src/apis/project.ts` - local project route and mutation helpers.
- Modify: `prototype/src/apis/tutorials.ts` - local course-series/course helpers.
- Create: `prototype/src/apis/docs.ts` - local docs content helpers.
- Create: `prototype/src/apis/user.ts` - local signed-in/user helpers.
- Create: `prototype/src/utils/query.ts` - tiny local async query helper for page parity.
- Create: `prototype/src/utils/format.ts` - local formatting helpers.
- Create: `prototype/src/components/common/ListResultWrapper.vue` - local loading/empty wrapper.
- Create: `prototype/src/components/common/TextView.vue` - local multiline text renderer.
- Create: `prototype/src/components/ui/PrototypeCard.vue` - local card shell for pages that need production-like grouping.
- Create: `prototype/src/components/ui/PrototypeButton.vue` - local button shell for repeated actions.
- Create: `prototype/src/components/community/user/UserHeader.vue`
- Create: `prototype/src/components/community/user/UserSidebar.vue`
- Create: `prototype/src/components/community/user/UserContent.vue`
- Create: `prototype/src/components/community/user/UserList.vue`
- Modify: `prototype/src/pages/community/user/index.vue`
- Create: `prototype/src/pages/community/user/overview.vue`
- Create: `prototype/src/pages/community/user/projects.vue`
- Create: `prototype/src/pages/community/user/likes.vue`
- Create: `prototype/src/pages/community/user/followers.vue`
- Create: `prototype/src/pages/community/user/following.vue`
- Modify: `prototype/src/pages/community/project.vue`
- Modify: `prototype/src/pages/community/home.vue`
- Modify: `prototype/src/pages/community/explore.vue`
- Modify: `prototype/src/pages/community/search.vue`
- Modify: `prototype/src/pages/tutorials/index.vue`
- Modify: `prototype/src/pages/tutorials/course-series.vue`
- Modify: `prototype/src/pages/tutorials/course-start.vue`
- Create: `prototype/src/pages/sign-in/callback.vue`
- Create: `prototype/src/pages/sign-in/token.vue`
- Create: `prototype/src/pages/docs/api.vue`
- Create: `prototype/src/pages/docs/ui-design/index.vue`
- Modify: `prototype/src/pages/404/index.vue`
- Modify: `prototype/src/pages/editor/index.vue`
- Create: `prototype/src/widgets/spx-runner/SpxRunner.ce.vue`
- Create: `prototype/src/widgets/spx-runner/index.ts`
- Create: `prototype/src/widgets/xgo-code-editor/XGoCodeEditor.ce.vue`
- Create: `prototype/src/widgets/xgo-code-editor/index.ts`
- Modify: `prototype/README.md`

Do not modify `spx-gui`.

## Task 1: Expand Prototype Contract Test

**Files:**
- Modify: `prototype/scripts/check-prototype.mjs`

- [ ] **Step 1: Add failing checks for all required files and routes**

Update the required route array to include every spec route:

```js
const requiredRoutes = [
  '/',
  '/explore',
  '/search',
  '/user/:nameInput',
  'projects',
  'likes',
  'followers',
  'following',
  '/project/:ownerInput/:nameInput',
  '/editor',
  '/editor/:ownerNameInput/:projectNameInput/:inEditorPath*',
  '/tutorials',
  '/course/:courseSeriesIdInput/:courseIdInput/start',
  '/course-series/:courseSeriesIdInput',
  '/sign-in/callback',
  '/sign-in/token',
  '/share/:owner/:name',
  '/docs',
  'api/:pathMatch(.*)?',
  'ui-design',
  '/:pathMatch(.*)*'
]
```

Add file checks for the new page and widget files:

```js
const requiredFiles = [
  'src/pages/community/user/overview.vue',
  'src/pages/community/user/projects.vue',
  'src/pages/community/user/likes.vue',
  'src/pages/community/user/followers.vue',
  'src/pages/community/user/following.vue',
  'src/pages/sign-in/callback.vue',
  'src/pages/sign-in/token.vue',
  'src/pages/docs/api.vue',
  'src/pages/docs/ui-design/index.vue',
  'src/widgets/spx-runner/SpxRunner.ce.vue',
  'src/widgets/spx-runner/index.ts',
  'src/widgets/xgo-code-editor/XGoCodeEditor.ce.vue',
  'src/widgets/xgo-code-editor/index.ts'
]
```

- [ ] **Step 2: Add offline boundary checks**

Extend the source-file scan:

```js
if (text.includes('spx-gui')) failures.push(`forbidden real frontend reference: ${rel}`)
if (/\baxios\b/.test(text)) failures.push(`forbidden server call primitive: ${rel}`)
if (/\bfetch\s*\(/.test(text) && /https?:\/\//.test(text)) failures.push(`forbidden remote fetch call: ${rel}`)
if (text.includes('@scalar/api-reference')) failures.push(`docs page must use local static prototype content: ${rel}`)
```

- [ ] **Step 3: Run the contract test and verify it fails**

Run:

```bash
cd /Users/zengqingqing/workspace/builder/ui/prototype
npm run test:prototype
```

Expected: FAIL with missing user child pages, docs pages, sign-in pages, and widget files.

## Task 2: Add Local Mock Domains

**Files:**
- Modify: `prototype/src/data/mock.ts`
- Modify: `prototype/src/apis/community.ts`
- Modify: `prototype/src/apis/project.ts`
- Modify: `prototype/src/apis/tutorials.ts`
- Create: `prototype/src/apis/docs.ts`
- Create: `prototype/src/apis/user.ts`
- Create: `prototype/src/utils/format.ts`

- [ ] **Step 1: Extend mock data types**

Add these fields and collections to `mock.ts`:

```ts
export type Release = {
  id: string
  version: string
  createdAt: string
  notes: string
}

export type ActivityUser = UserProfile & {
  relation: 'follower' | 'following'
}

export type DocsEndpoint = {
  method: 'GET' | 'POST'
  path: string
  title: string
  description: string
  response: string
}

export type WidgetSample = {
  id: string
  title: string
  description: string
}
```

Populate:

```ts
export const signedInUsername = 'qingqing'
export const releases: Release[] = [
  {
    id: 'niu-run-v3',
    version: 'v3',
    createdAt: 'Today',
    notes: 'Adjusted movement timing and refreshed the local thumbnail.'
  },
  {
    id: 'niu-run-v2',
    version: 'v2',
    createdAt: '1 week ago',
    notes: 'Added touch controls and clearer start instructions.'
  }
]
export const docsEndpoints: DocsEndpoint[] = [
  {
    method: 'GET',
    path: '/api/projects',
    title: 'List projects',
    description: 'Returns a paginated local prototype project list.',
    response: '{ "data": [{ "name": "niu-run", "owner": "qingqing" }], "total": 1 }'
  },
  {
    method: 'POST',
    path: '/api/copilot/messages',
    title: 'Generate local Copilot reply',
    description: 'Prototype-only static response used to preserve the documentation surface.',
    response: '{ "message": "This is a local prototype response." }'
  }
]
export const widgetSamples: WidgetSample[] = [
  {
    id: 'runner',
    title: 'Local SPX runner',
    description: 'Runs the bundled niu-run project preview with local state.'
  },
  {
    id: 'code-editor',
    title: 'Local XGo code editor',
    description: 'Shows code, diagnostics, and snippets without Monaco or LSP.'
  }
]
```

- [ ] **Step 2: Add user API facade**

Create `prototype/src/apis/user.ts`:

```ts
import { signedInUsername, users, type UserProfile } from '@/data/mock'

export function getSignedInUser(): UserProfile {
  return getUserProfile(signedInUsername)
}

export function getUserProfile(username: string): UserProfile {
  return users.find((user) => user.username === username) ?? users[0]
}

export function listFollowers(username: string): UserProfile[] {
  return users.filter((user) => user.username !== username)
}

export function listFollowing(username: string): UserProfile[] {
  return [...users].reverse().filter((user) => user.username !== username)
}
```

- [ ] **Step 3: Add docs API facade**

Create `prototype/src/apis/docs.ts`:

```ts
import { docsEndpoints } from '@/data/mock'

export function listDocsEndpoints() {
  return docsEndpoints
}
```

- [ ] **Step 4: Add format helpers**

Create `prototype/src/utils/format.ts`:

```ts
export function humanizeCount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
  return String(value)
}
```

- [ ] **Step 5: Run typecheck through build**

Run:

```bash
cd /Users/zengqingqing/workspace/builder/ui/prototype
npm run build
```

Expected: it may still fail because routes/pages are not yet created, but mock modules should not have TypeScript errors.

## Task 3: Align Router With Real Frontend

**Files:**
- Modify: `prototype/src/router.ts`

- [ ] **Step 1: Add local route helpers**

Add helper exports above router creation:

```ts
export type UserTab = 'overview' | 'projects' | 'likes' | 'followers' | 'following'

export function getProjectPageRoute(owner: string, name: string) {
  return `/project/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
}

export function getProjectEditorRoute(owner: string, name: string) {
  return `/editor/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
}

export function getUserPageRoute(name: string, tab: UserTab = 'overview') {
  const base = `/user/${encodeURIComponent(name)}`
  return tab === 'overview' ? base : `${base}/${tab}`
}
```

- [ ] **Step 2: Replace the route tree**

Use the real route shape with local components:

```ts
{
  path: '/user/:nameInput',
  component: () => import('@/pages/community/user/index.vue'),
  props: true,
  children: [
    { path: '', component: () => import('@/pages/community/user/overview.vue'), props: true },
    { path: 'projects', component: () => import('@/pages/community/user/projects.vue'), props: true },
    { path: 'likes', component: () => import('@/pages/community/user/likes.vue'), props: true },
    { path: 'followers', component: () => import('@/pages/community/user/followers.vue'), props: true },
    { path: 'following', component: () => import('@/pages/community/user/following.vue'), props: true }
  ]
}
```

Add docs, sign-in, share redirect, and editor redirect routes as listed in the spec.

- [ ] **Step 3: Run contract test**

Run:

```bash
cd /Users/zengqingqing/workspace/builder/ui/prototype
npm run test:prototype
```

Expected: route checks pass; missing page/widget file checks still fail until later tasks.

## Task 4: Add Shared Local Components

**Files:**
- Create: `prototype/src/components/common/ListResultWrapper.vue`
- Create: `prototype/src/components/common/TextView.vue`
- Create: `prototype/src/components/ui/PrototypeCard.vue`
- Create: `prototype/src/components/ui/PrototypeButton.vue`

- [ ] **Step 1: Add ListResultWrapper**

Create a small wrapper that accepts arrays and empty height:

```vue
<script setup lang="ts">
defineProps<{ items?: unknown[]; height?: number; emptyText?: string }>()
</script>

<template>
  <div :style="{ minHeight: height != null ? `${height}px` : undefined }">
    <slot v-if="items == null || items.length > 0" :data="items" />
    <div v-else class="flex items-center justify-center rounded-md bg-grey-100 p-8 text-grey-700">
      <slot name="empty">{{ emptyText ?? 'No results' }}</slot>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Add TextView**

Create a simple multiline renderer:

```vue
<script setup lang="ts">
defineProps<{ text?: string; placeholder?: string }>()
</script>

<template>
  <p class="whitespace-pre-wrap leading-6 text-grey-800">
    {{ text && text.length > 0 ? text : placeholder }}
  </p>
</template>
```

- [ ] **Step 3: Add card and button shells**

Create reusable shells with Tailwind-only styling, no external dependencies.

- [ ] **Step 4: Run build**

Run:

```bash
cd /Users/zengqingqing/workspace/builder/ui/prototype
npm run build
```

Expected: build may still fail only for missing page imports from router.

## Task 5: Rebuild User Route Surface

**Files:**
- Create: `prototype/src/components/community/user/UserHeader.vue`
- Create: `prototype/src/components/community/user/UserSidebar.vue`
- Create: `prototype/src/components/community/user/UserContent.vue`
- Create: `prototype/src/components/community/user/UserList.vue`
- Modify: `prototype/src/pages/community/user/index.vue`
- Create: `prototype/src/pages/community/user/overview.vue`
- Create: `prototype/src/pages/community/user/projects.vue`
- Create: `prototype/src/pages/community/user/likes.vue`
- Create: `prototype/src/pages/community/user/followers.vue`
- Create: `prototype/src/pages/community/user/following.vue`

- [ ] **Step 1: Implement `UserHeader`**

Render cover, avatar, display name, username, bio, and counts from `UserProfile`.

- [ ] **Step 2: Implement `UserSidebar`**

Use `getUserPageRoute(username, tab)` links for Overview, Projects, Likes, Followers, Following.

- [ ] **Step 3: Implement route shell**

Replace `user/index.vue` with the real structure:

```vue
<template>
  <CenteredWrapper class="flex-[1_0_auto] flex flex-col gap-5 pt-6 pb-10" size="large">
    <UserHeader :user="user" />
    <div class="flex items-start gap-5">
      <UserSidebar class="flex-none" :username="user.username" />
      <div class="min-w-0 flex-[1_1_0]">
        <router-view />
      </div>
    </div>
  </CenteredWrapper>
</template>
```

- [ ] **Step 4: Implement child pages**

Use `ProjectsSection` and `ProjectCard` for overview/projects/likes. Use `UserList` for followers/following.

- [ ] **Step 5: Run checks**

Run:

```bash
cd /Users/zengqingqing/workspace/builder/ui/prototype
npm run test:prototype
npm run build
```

Expected: user page imports compile.

## Task 6: Expand Community Project Page

**Files:**
- Modify: `prototype/src/pages/community/project.vue`
- Modify: `prototype/src/apis/project.ts`
- Modify: `prototype/src/data/mock.ts`

- [ ] **Step 1: Add project detail metadata**

Extend project mock records with `releaseHistory`, `remixedFrom`, `createdAt`, and local action flags where needed.

- [ ] **Step 2: Rework page layout**

Mirror the production surface: preview runner, owner info, metadata, action buttons, description, instructions, remix source, release history, and related projects.

- [ ] **Step 3: Keep actions local**

Like, share, run, edit, and unpublish-style buttons should update local state or route locally. No server calls.

- [ ] **Step 4: Run checks**

Run:

```bash
cd /Users/zengqingqing/workspace/builder/ui/prototype
npm run test:prototype
npm run build
```

Expected: project page builds and contract checks remain green except for pages not yet created.

## Task 7: Align Tutorials Pages

**Files:**
- Modify: `prototype/src/pages/tutorials/index.vue`
- Modify: `prototype/src/pages/tutorials/course-series.vue`
- Modify: `prototype/src/pages/tutorials/course-start.vue`
- Modify: `prototype/src/apis/tutorials.ts`
- Modify: `prototype/src/components/tutorials/CourseSeriesCard.vue`
- Create or modify: `prototype/src/components/tutorials/CourseItem.vue`

- [ ] **Step 1: Align tutorials index**

Use navbar, banner, centered wrapper, grid, pagination-like local state, and footer to match the real page structure.

- [ ] **Step 2: Align course-series page**

Render course-series card, thumbnail, description, course grid, and local start links.

- [ ] **Step 3: Align course-start page**

Render local tutorial start/progress surface. It should route back to editor/project locally.

- [ ] **Step 4: Run checks**

Run:

```bash
cd /Users/zengqingqing/workspace/builder/ui/prototype
npm run test:prototype
npm run build
```

Expected: tutorials pages compile.

## Task 8: Add Sign-In And Docs Surfaces

**Files:**
- Create: `prototype/src/pages/sign-in/callback.vue`
- Create: `prototype/src/pages/sign-in/token.vue`
- Create: `prototype/src/pages/docs/api.vue`
- Create: `prototype/src/pages/docs/ui-design/index.vue`
- Create: `prototype/src/apis/docs.ts`

- [ ] **Step 1: Add sign-in callback page**

Render a local state screen explaining prototype sign-in is simulated and provide a button back home.

- [ ] **Step 2: Add sign-in token page**

Render deterministic token/profile data from `getSignedInUser()` without real auth.

- [ ] **Step 3: Add docs API page**

Render local endpoint list and response examples from `listDocsEndpoints()`.

- [ ] **Step 4: Add docs UI design page**

Create a compact local component-state playground matching the production intent using local `PrototypeButton`, `ProjectCard`, `ProjectsSection`, and color/token swatches.

- [ ] **Step 5: Run checks**

Run:

```bash
cd /Users/zengqingqing/workspace/builder/ui/prototype
npm run test:prototype
npm run build
```

Expected: docs and sign-in routes compile without external docs/auth packages.

## Task 9: Add Widget Prototype Surfaces

**Files:**
- Create: `prototype/src/widgets/spx-runner/SpxRunner.ce.vue`
- Create: `prototype/src/widgets/spx-runner/index.ts`
- Create: `prototype/src/widgets/xgo-code-editor/XGoCodeEditor.ce.vue`
- Create: `prototype/src/widgets/xgo-code-editor/index.ts`
- Modify: `prototype/src/data/mock.ts`

- [ ] **Step 1: Implement `SpxRunner.ce.vue`**

Render a self-contained runner preview using local project mock data and a Run/Stop state.

- [ ] **Step 2: Implement `xgo-code-editor` widget**

Render a self-contained editor-like code surface with tabs, gutter, local diagnostics, and no Monaco/LSP dependency.

- [ ] **Step 3: Export custom element entrypoints**

Use Vue custom element exports:

```ts
import { defineCustomElement } from 'vue'
import SpxRunner from './SpxRunner.ce.vue'

customElements.define('xbuilder-spx-runner-prototype', defineCustomElement(SpxRunner))
```

- [ ] **Step 4: Run checks**

Run:

```bash
cd /Users/zengqingqing/workspace/builder/ui/prototype
npm run test:prototype
npm run build
```

Expected: widget files compile and contract checks pass for widget existence.

## Task 10: Final Alignment And Browser Verification

**Files:**
- Modify: `prototype/README.md`
- Modify: `prototype/src/pages/404/index.vue`
- Modify as needed: changed prototype pages from previous tasks

- [ ] **Step 1: Update README scope**

Document the full route coverage and offline mock contract.

- [ ] **Step 2: Run full validation**

Run:

```bash
cd /Users/zengqingqing/workspace/builder/ui/prototype
npm run test:prototype
npm run build
```

Expected:

```text
Prototype contract check passed.
```

and Vite build succeeds.

- [ ] **Step 3: Start dev server**

Run:

```bash
cd /Users/zengqingqing/workspace/builder/ui/prototype
npm run dev -- --host 127.0.0.1 --port 5174
```

Expected: server listens on `http://127.0.0.1:5174/`. If the port is busy, use `5175`.

- [ ] **Step 4: Browser-check representative routes**

Open and inspect:

```text
http://127.0.0.1:5174/
http://127.0.0.1:5174/explore
http://127.0.0.1:5174/search
http://127.0.0.1:5174/user/qingqing
http://127.0.0.1:5174/user/qingqing/projects
http://127.0.0.1:5174/user/qingqing/likes
http://127.0.0.1:5174/user/qingqing/followers
http://127.0.0.1:5174/project/qingqing/niu-run
http://127.0.0.1:5174/editor/qingqing/niu-run
http://127.0.0.1:5174/tutorials
http://127.0.0.1:5174/course-series/code-kiko-usage
http://127.0.0.1:5174/course/code-kiko-usage/move/start
http://127.0.0.1:5174/sign-in/callback
http://127.0.0.1:5174/sign-in/token
http://127.0.0.1:5174/docs/api
http://127.0.0.1:5174/docs/ui-design
http://127.0.0.1:5174/missing-route
```

Expected: no blank pages, no console errors from missing modules, navigation remains local, and pages do not attempt real backend/auth/docs calls.

- [ ] **Step 5: Final source scan**

Run:

```bash
cd /Users/zengqingqing/workspace/builder/ui/prototype
rg -n "spx-gui|axios|fetch\\s*\\(\\s*['\\\"]https?://" src scripts vite.config.ts package.json
```

Expected: no forbidden matches.
