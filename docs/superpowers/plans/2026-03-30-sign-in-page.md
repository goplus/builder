# Sign-In Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved `/sign-in` page in `spx-gui`, route unauthenticated users through it, and keep authentication on the existing Casdoor redirect flow with safe post-login return handling.

**Architecture:** Add a small sign-in entry utility layer for safe `returnTo` normalization and provider-aware redirect parameters, then wire router and existing entry points through a new `/sign-in` page. Keep the new page visually rich but behaviorally thin by splitting presentation into hero and panel components while leaving redirect logic in the auth store layer.

**Tech Stack:** Vue 3, TypeScript, Vue Router 4, scoped SCSS, Vitest, Vue Test Utils, Casdoor JS SDK

---

### Task 1: Sign-In Entry Utilities

**Files:**
- Create: `spx-gui/src/stores/user/sign-in-entry.ts`
- Create: `spx-gui/src/stores/user/sign-in-entry.test.ts`
- Modify: `spx-gui/src/utils/env.ts:16-22,53-57`
- Modify: `spx-gui/src/stores/user/index.ts:1-7`
- Modify: `spx-gui/src/stores/user/signed-in.ts:12-75`

- [ ] **Step 1: Record the new env keys in the documented template**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildProviderParams,
  getDefaultReturnTo,
  getSignInRoute,
  normalizeSafeReturnTo
} from './sign-in-entry'

describe('sign-in-entry', () => {
  const originalLocation = window.location

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        origin: 'https://xbuilder.com',
        pathname: '/project/alice/demo',
        search: '?tab=play',
        hash: '#runner'
      }
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation
    })
  })

  it('keeps safe internal return targets', () => {
    expect(normalizeSafeReturnTo('/editor/alice/demo?publish#share')).toBe('/editor/alice/demo?publish#share')
  })

  it('rejects unsafe return targets', () => {
    expect(normalizeSafeReturnTo('https://evil.example')).toBe('/')
    expect(normalizeSafeReturnTo('//evil.example')).toBe('/')
    expect(normalizeSafeReturnTo('editor/alice/demo')).toBe('/')
  })

  it('builds the default return target from the current location', () => {
    expect(getDefaultReturnTo()).toBe('/project/alice/demo?tab=play#runner')
  })

  it('builds a sign-in route with an encoded safe return target', () => {
    expect(getSignInRoute('/project/alice/demo?tab=play#runner')).toBe(
      '/sign-in?returnTo=%2Fproject%2Falice%2Fdemo%3Ftab%3Dplay%23runner'
    )
  })

  it('returns null provider params when a provider is not configured', () => {
    expect(buildProviderParams({ providerParamName: 'provider', providerValue: '' })).toBeNull()
  })

  it('builds provider params when name and value are configured', () => {
    expect(buildProviderParams({ providerParamName: 'provider', providerValue: 'wechat' })).toEqual({
      provider: 'wechat'
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd spx-gui
npm test -- --run src/stores/user/sign-in-entry.test.ts
```

Expected: FAIL with module-not-found errors for `sign-in-entry.ts` exports.

- [ ] **Step 3: Write the minimal implementation**

`spx-gui/src/stores/user/sign-in-entry.ts`

```ts
import {
  casdoorProviderParamName,
  casdoorQqProvider,
  casdoorWeChatProvider
} from '@/utils/env'

export function getDefaultReturnTo() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

export function normalizeSafeReturnTo(input: string | null | undefined) {
  if (input == null || input === '') return '/'
  if (!input.startsWith('/')) return '/'
  if (input.startsWith('//')) return '/'
  return input
}

export function getSignInRoute(returnTo: string = getDefaultReturnTo()) {
  const safeReturnTo = normalizeSafeReturnTo(returnTo)
  if (safeReturnTo === '/') return '/sign-in'
  return `/sign-in?returnTo=${encodeURIComponent(safeReturnTo)}`
}

export function buildProviderParams(config: { providerParamName: string; providerValue: string }) {
  if (config.providerParamName === '' || config.providerValue === '') return null
  return { [config.providerParamName]: config.providerValue }
}

export function getWeChatProviderParams() {
  return buildProviderParams({
    providerParamName: casdoorProviderParamName,
    providerValue: casdoorWeChatProvider
  })
}

export function getQQProviderParams() {
  return buildProviderParams({
    providerParamName: casdoorProviderParamName,
    providerValue: casdoorQqProvider
  })
}
```

`spx-gui/src/utils/env.ts`

```ts
export const casdoorProviderParamName = (import.meta.env.VITE_CASDOOR_PROVIDER_PARAM_NAME as string) || 'provider'
export const casdoorWeChatProvider = (import.meta.env.VITE_CASDOOR_WECHAT_PROVIDER as string) || ''
export const casdoorQqProvider = (import.meta.env.VITE_CASDOOR_QQ_PROVIDER as string) || ''
```

`spx-gui/src/stores/user/signed-in.ts`

```ts
import { getDefaultReturnTo, getQQProviderParams, getWeChatProviderParams, getSignInRoute } from './sign-in-entry'

export function goToSignIn(returnTo: string = getDefaultReturnTo()) {
  window.location.assign(getSignInRoute(returnTo))
}

export function initiateSignIn(returnTo: string = getDefaultReturnTo(), additionalParams?: Record<string, string>) {
  const casdoorSdk = new Sdk({
    ...casdoorConfig,
    redirectPath: `${casdoorAuthRedirectPath}?returnTo=${encodeURIComponent(returnTo)}`
  })
  casdoorSdk.signin_redirect(additionalParams)
}

export function initiateWeChatSignIn(returnTo: string = getDefaultReturnTo()) {
  initiateSignIn(returnTo, getWeChatProviderParams() ?? undefined)
}

export function initiateQQSignIn(returnTo: string = getDefaultReturnTo()) {
  initiateSignIn(returnTo, getQQProviderParams() ?? undefined)
}
```

`spx-gui/src/stores/user/index.ts`

```ts
export * from './sign-in-entry'
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd spx-gui
npm test -- --run src/stores/user/sign-in-entry.test.ts
```

Expected: PASS with 6 passing tests and no import errors.

- [ ] **Step 5: Commit**

```bash
git add \
  spx-gui/src/utils/env.ts \
  spx-gui/src/stores/user/index.ts \
  spx-gui/src/stores/user/signed-in.ts \
  spx-gui/src/stores/user/sign-in-entry.ts \
  spx-gui/src/stores/user/sign-in-entry.test.ts
git commit -m "feat: add sign-in entry helpers"
```

### Task 2: Route `/sign-in` Through Router and Add the Page Shell

**Files:**
- Create: `spx-gui/src/pages/sign-in/index.vue`
- Create: `spx-gui/src/pages/sign-in/index.test.ts`
- Modify: `spx-gui/src/router.ts:5,136-156,185-193`

- [ ] **Step 1: Write the failing test**

`spx-gui/src/pages/sign-in/index.test.ts`

```ts
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const replace = vi.fn()
const initiateWeChatSignIn = vi.fn()
const initiateQQSignIn = vi.fn()
const initiateSignIn = vi.fn()
let signedInState = { isSignedIn: false, user: null as null | { username: string } }

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { returnTo: '/project/alice/demo' } }),
  useRouter: () => ({ replace })
}))

vi.mock('@/stores/user', () => ({
  useSignedInStateQuery: () => ({
    isLoading: { value: false },
    data: { value: signedInState }
  }),
  initiateWeChatSignIn,
  initiateQQSignIn,
  initiateSignIn
}))

import SignInPage from './index.vue'

describe('sign-in page shell', () => {
  beforeEach(() => {
    replace.mockReset()
    initiateWeChatSignIn.mockReset()
    initiateQQSignIn.mockReset()
    initiateSignIn.mockReset()
    signedInState = { isSignedIn: false, user: null }
  })

  it('renders the three approved sign-in actions', () => {
    const wrapper = mount(SignInPage)
    expect(wrapper.text()).toContain('XBuilder')
    expect(wrapper.text()).toContain('登录')
    expect(wrapper.text()).toContain('使用微信登录')
    expect(wrapper.text()).toContain('使用 QQ 登录')
    expect(wrapper.text()).toContain('用户名密码登录')
  })

  it('redirects signed-in visitors away from /sign-in', async () => {
    signedInState = { isSignedIn: true, user: { username: 'alice' } }
    mount(SignInPage)
    await flushPromises()
    expect(replace).toHaveBeenCalledWith('/project/alice/demo')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd spx-gui
npm test -- --run src/pages/sign-in/index.test.ts
```

Expected: FAIL because `src/pages/sign-in/index.vue` does not exist and `/sign-in` is not wired.

- [ ] **Step 3: Write the minimal implementation**

`spx-gui/src/pages/sign-in/index.vue`

```vue
<template>
  <main class="page">
    <section class="card">
      <h1 class="title">{{ $t({ en: 'Sign in', zh: '登录' }) }}</h1>
      <div class="brand">XBuilder</div>
      <UIButton class="wechat" color="primary" @click="handleWeChat">
        {{ $t({ en: 'Use WeChat to sign in', zh: '使用微信登录' }) }}
      </UIButton>
      <UIButton class="qq" color="white" variant="stroke" @click="handleQQ">
        {{ $t({ en: 'Use QQ to sign in', zh: '使用 QQ 登录' }) }}
      </UIButton>
      <button class="password" type="button" @click="handlePassword">
        {{ $t({ en: 'Sign in with username and password', zh: '用户名密码登录' }) }}
      </button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UIButton } from '@/components/ui'
import {
  initiateQQSignIn,
  initiateSignIn,
  initiateWeChatSignIn,
  normalizeSafeReturnTo,
  useSignedInStateQuery
} from '@/stores/user'
import { usePageTitle } from '@/utils/utils'

const route = useRoute()
const router = useRouter()
const signedInStateQuery = useSignedInStateQuery()
const returnTo = computed(() => normalizeSafeReturnTo(route.query.returnTo as string | undefined))

usePageTitle({ en: 'Sign in', zh: '登录' })

watchEffect(() => {
  const state = signedInStateQuery.data.value
  if (state?.isSignedIn) router.replace(returnTo.value)
})

function handleWeChat() {
  initiateWeChatSignIn(returnTo.value)
}

function handleQQ() {
  initiateQQSignIn(returnTo.value)
}

function handlePassword() {
  initiateSignIn(returnTo.value)
}
</script>
```

`spx-gui/src/router.ts`

```ts
import { getDefaultReturnTo, getSignInRoute, goToSignIn, isSignedIn, getUnresolvedSignedInUsername } from './stores/user'

{
  path: '/sign-in',
  component: () => import('@/pages/sign-in/index.vue')
},

if (username == null) {
  return getSignInRoute(`/editor/${encodeURIComponent(projectNameInput as string)}`)
}

router.beforeEach((to, _, next) => {
  if (to.meta.requiresSignIn && !isSignedIn()) {
    next(getSignInRoute(to.fullPath || getDefaultReturnTo()))
  } else {
    next()
  }
})
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd spx-gui
npm test -- --run src/pages/sign-in/index.test.ts
```

Expected: PASS with page shell rendering and signed-in redirect behavior covered.

- [ ] **Step 5: Commit**

```bash
git add \
  spx-gui/src/router.ts \
  spx-gui/src/pages/sign-in/index.vue \
  spx-gui/src/pages/sign-in/index.test.ts
git commit -m "feat: add sign-in route shell"
```

### Task 3: Build the Final Figma Layout and Sign-In Components

**Files:**
- Create: `spx-gui/src/components/sign-in/SignInHero.vue`
- Create: `spx-gui/src/components/sign-in/SignInPanel.vue`
- Create: `spx-gui/src/pages/sign-in/assets/sign-in-hero.svg`
- Create: `spx-gui/src/pages/sign-in/assets/icon-wechat.svg`
- Create: `spx-gui/src/pages/sign-in/assets/icon-qq.svg`
- Modify: `spx-gui/src/pages/sign-in/index.vue`
- Modify: `spx-gui/src/pages/sign-in/index.test.ts`

- [ ] **Step 1: Write the failing test**

Append these assertions to `spx-gui/src/pages/sign-in/index.test.ts`:

```ts
it('calls provider-specific helpers with the normalized return target', async () => {
  const wrapper = mount(SignInPage)

  await wrapper.find('[data-testid="sign-in-wechat"]').trigger('click')
  await wrapper.find('[data-testid="sign-in-qq"]').trigger('click')
  await wrapper.find('[data-testid="sign-in-password"]').trigger('click')

  expect(initiateWeChatSignIn).toHaveBeenCalledWith('/project/alice/demo')
  expect(initiateQQSignIn).toHaveBeenCalledWith('/project/alice/demo')
  expect(initiateSignIn).toHaveBeenCalledWith('/project/alice/demo')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd spx-gui
npm test -- --run src/pages/sign-in/index.test.ts
```

Expected: FAIL because the page does not yet expose the final test ids and split components.

- [ ] **Step 3: Write the minimal implementation**

`spx-gui/src/components/sign-in/SignInPanel.vue`

```vue
<script setup lang="ts">
defineProps<{
  logoSrc: string
  wechatIconSrc: string
  qqIconSrc: string
  loading: null | 'wechat' | 'qq' | 'password'
}>()

defineEmits<{
  wechat: []
  qq: []
  password: []
}>()
</script>

<template>
  <section class="sign-in-panel">
    <div class="brand-block">
      <img class="logo" :src="logoSrc" alt="" />
      <div class="brand-name">XBuilder</div>
    </div>

    <div class="actions">
      <UIButton data-testid="sign-in-wechat" class="wechat" color="primary" :loading="loading === 'wechat'" @click="$emit('wechat')">
        <template #icon><img class="icon" :src="wechatIconSrc" alt="" /></template>
        {{ $t({ en: 'Use WeChat to sign in', zh: '使用微信登录' }) }}
      </UIButton>

      <UIButton data-testid="sign-in-qq" class="qq" color="white" variant="stroke" :loading="loading === 'qq'" @click="$emit('qq')">
        <template #icon><img class="icon" :src="qqIconSrc" alt="" /></template>
        {{ $t({ en: 'Use QQ to sign in', zh: '使用 QQ 登录' }) }}
      </UIButton>

      <button data-testid="sign-in-password" class="password" type="button" :disabled="loading != null" @click="$emit('password')">
        {{ $t({ en: 'Sign in with username and password', zh: '用户名密码登录' }) }}
      </button>
    </div>
  </section>
</template>
```

`spx-gui/src/components/sign-in/SignInHero.vue`

```vue
<script setup lang="ts">
defineProps<{
  heroSrc: string
}>()
</script>

<template>
  <section class="sign-in-hero">
    <h1 class="title">{{ $t({ en: 'Sign in', zh: '登录' }) }}</h1>
    <img class="illustration" :src="heroSrc" alt="" />
  </section>
</template>
```

`spx-gui/src/pages/sign-in/index.vue`

```vue
<template>
  <main class="page">
    <section class="card">
      <SignInHero :hero-src="heroSrc" />
      <SignInPanel
        :loading="loading"
        :logo-src="logoSrc"
        :wechat-icon-src="wechatIconSrc"
        :qq-icon-src="qqIconSrc"
        @wechat="handleWeChat"
        @qq="handleQQ"
        @password="handlePassword"
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import logoSrc from '@/assets/logo.svg'
import heroSrc from './assets/sign-in-hero.svg'
import wechatIconSrc from './assets/icon-wechat.svg'
import qqIconSrc from './assets/icon-qq.svg'
import SignInHero from '@/components/sign-in/SignInHero.vue'
import SignInPanel from '@/components/sign-in/SignInPanel.vue'
import {
  initiateQQSignIn,
  initiateSignIn,
  initiateWeChatSignIn,
  normalizeSafeReturnTo,
  useSignedInStateQuery
} from '@/stores/user'
import { usePageTitle } from '@/utils/utils'

const route = useRoute()
const router = useRouter()
const signedInStateQuery = useSignedInStateQuery()
const returnTo = computed(() => normalizeSafeReturnTo(route.query.returnTo as string | undefined))

const loading = ref<null | 'wechat' | 'qq' | 'password'>(null)

usePageTitle({ en: 'Sign in', zh: '登录' })

watchEffect(() => {
  const state = signedInStateQuery.data.value
  if (state?.isSignedIn) router.replace(returnTo.value)
})

function handleWeChat() {
  loading.value = 'wechat'
  initiateWeChatSignIn(returnTo.value)
}

function handleQQ() {
  loading.value = 'qq'
  initiateQQSignIn(returnTo.value)
}

function handlePassword() {
  loading.value = 'password'
  initiateSignIn(returnTo.value)
}
</script>
```

Use scoped SCSS in `index.vue`, `SignInHero.vue`, and `SignInPanel.vue` to match the approved Figma structure:

```scss
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background:
    radial-gradient(circle at top left, rgba(110, 151, 219, 0.22), transparent 42%),
    radial-gradient(circle at bottom right, rgba(64, 186, 196, 0.2), transparent 38%),
    #eff3fd;
}

.card {
  width: min(100%, 1000px);
  min-height: 600px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 16px 32px -12px rgba(64, 186, 196, 0.18);
}

@media (max-width: 960px) {
  .card {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd spx-gui
npm test -- --run src/pages/sign-in/index.test.ts
```

Expected: PASS with button click behavior covered after the component split.

- [ ] **Step 5: Commit**

```bash
git add \
  spx-gui/src/components/sign-in/SignInHero.vue \
  spx-gui/src/components/sign-in/SignInPanel.vue \
  spx-gui/src/pages/sign-in/assets/sign-in-hero.svg \
  spx-gui/src/pages/sign-in/assets/icon-wechat.svg \
  spx-gui/src/pages/sign-in/assets/icon-qq.svg \
  spx-gui/src/pages/sign-in/index.vue \
  spx-gui/src/pages/sign-in/index.test.ts
git commit -m "feat: implement sign-in page UI"
```

### Task 4: Rewire Existing Entry Points and Harden the Callback

**Files:**
- Modify: `spx-gui/src/components/navbar/NavbarProfile.vue:3-10,82-90`
- Modify: `spx-gui/src/components/community/home/banner/GuestBanner.vue:1-8`
- Modify: `spx-gui/src/components/copilot/feedback/api-exception/SignInTip.vue:6-23`
- Modify: `spx-gui/src/components/community/user/UserHeader.vue:35-57`
- Modify: `spx-gui/src/pages/community/project.vue:358-378`
- Modify: `spx-gui/src/utils/user.ts:1-21`
- Create: `spx-gui/src/pages/sign-in/callback-utils.ts`
- Create: `spx-gui/src/pages/sign-in/callback-utils.test.ts`
- Modify: `spx-gui/src/pages/sign-in/callback.vue:7-24`

- [ ] **Step 1: Write the failing test**

`spx-gui/src/pages/sign-in/callback-utils.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { getCallbackReturnTo } from './callback-utils'

describe('getCallbackReturnTo', () => {
  it('returns a normalized internal return target', () => {
    expect(getCallbackReturnTo('?returnTo=%2Fproject%2Falice%2Fdemo')).toBe('/project/alice/demo')
  })

  it('falls back to / for unsafe return targets', () => {
    expect(getCallbackReturnTo('?returnTo=https%3A%2F%2Fevil.example')).toBe('/')
  })

  it('falls back to / when returnTo is missing', () => {
    expect(getCallbackReturnTo('')).toBe('/')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd spx-gui
npm test -- --run src/pages/sign-in/callback-utils.test.ts
```

Expected: FAIL because `callback-utils.ts` does not exist.

- [ ] **Step 3: Write the minimal implementation**

Replace direct `initiateSignIn()` call sites with `goToSignIn()` or `getSignInRoute(...)`-based routing:

```ts
// NavbarProfile.vue
import { goToSignIn } from '@/stores/user'
@click="goToSignIn()"

// GuestBanner.vue
import { goToSignIn } from '@/stores/user'
function handleJoin() {
  goToSignIn()
}

// SignInTip.vue
import { goToSignIn, isSignedIn } from '@/stores/user'
<UIButton variant="flat" class="sign-in-btn" @click="goToSignIn()">

// utils/user.ts
import { goToSignIn, isSignedIn } from '@/stores/user'
confirmHandler: () => goToSignIn()

// UserHeader.vue
import { goToSignIn, useSignedInUser } from '@/stores/user'
await timeout(2000)
goToSignIn()

// community/project.vue
function handleSignIn() {
  goToSignIn(route.fullPath)
}
```

`spx-gui/src/pages/sign-in/callback-utils.ts`

```ts
import { normalizeSafeReturnTo } from '@/stores/user/sign-in-entry'

export function getCallbackReturnTo(search: string) {
  const params = new URLSearchParams(search)
  return normalizeSafeReturnTo(params.get('returnTo'))
}
```

`spx-gui/src/pages/sign-in/callback.vue`

```ts
import { completeSignIn } from '@/stores/user'
import { getCallbackReturnTo } from './callback-utils'

try {
  await completeSignIn()
  const returnTo = getCallbackReturnTo(location.search)
  window.location.replace(returnTo)
} catch (e) {
  console.error('failed to complete sign-in', e)
  window.location.replace('/')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd spx-gui
npm test -- --run src/pages/sign-in/callback-utils.test.ts
npm test -- --run src/stores/user/sign-in-entry.test.ts src/pages/sign-in/index.test.ts
```

Expected: PASS for callback safety and no regressions in the new sign-in page behavior.

- [ ] **Step 5: Commit**

```bash
git add \
  spx-gui/src/components/navbar/NavbarProfile.vue \
  spx-gui/src/components/community/home/banner/GuestBanner.vue \
  spx-gui/src/components/copilot/feedback/api-exception/SignInTip.vue \
  spx-gui/src/components/community/user/UserHeader.vue \
  spx-gui/src/pages/community/project.vue \
  spx-gui/src/utils/user.ts \
  spx-gui/src/pages/sign-in/callback-utils.ts \
  spx-gui/src/pages/sign-in/callback-utils.test.ts \
  spx-gui/src/pages/sign-in/callback.vue
git commit -m "feat: route sign-in entry points through /sign-in"
```

### Task 5: Verify the End-to-End Baseline

**Files:**
- Modify: `spx-gui/.env` (documentation only, if new vars are not yet listed)
- Verify only: `spx-gui/.env.development`, `spx-gui/.env.staging`, `spx-gui/.env.production`

- [ ] **Step 1: Record the new env keys in the documented template**

Add the new config keys to the documented `.env` template before any manual verification:

```dotenv
VITE_CASDOOR_PROVIDER_PARAM_NAME="provider"
VITE_CASDOOR_WECHAT_PROVIDER=""
VITE_CASDOOR_QQ_PROVIDER=""
```

- [ ] **Step 2: Run focused verification before the final suite**

Run:

```bash
cd spx-gui
npm run type-check
npm test -- --run src/stores/user/sign-in-entry.test.ts src/pages/sign-in/index.test.ts src/pages/sign-in/callback-utils.test.ts
```

Expected: PASS on type-check and all new targeted tests.

- [ ] **Step 3: Run the full test suite**

Run:

```bash
cd spx-gui
npm test -- --run
```

Expected: PASS with the project baseline still green.

- [ ] **Step 4: Perform manual Figma verification**

Checklist:

```md
- Open `/sign-in` on desktop and compare against the approved Figma node
- Confirm the card is centered with the expected split layout
- Confirm the WeChat button is visually primary and QQ is secondary
- Confirm `用户名密码登录` routes to hosted Casdoor login
- Confirm removing provider env values still allows WeChat and QQ buttons to sign in via the generic flow
- Confirm visiting `/sign-in?returnTo=%2Fproject%2Falice%2Fdemo` after sign-in returns to `/project/alice/demo`
- Confirm unsafe `returnTo` values such as `https://evil.example` fall back to `/`
- Confirm narrow screens stack the panel above the illustration
```

- [ ] **Step 5: Commit**

```bash
git add spx-gui/.env
git commit -m "docs: record sign-in provider env keys"
```
