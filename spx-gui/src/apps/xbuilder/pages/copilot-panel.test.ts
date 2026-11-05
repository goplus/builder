import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountPages, setupPageTests, signIn } from '@/apps/xbuilder/pages/test'
import { accountOAuthApisForXBuilder } from '@/apis/account/oauth'
import * as copilotApis from '@/apis/copilot'
import * as userApis from '@/apis/user'
import { getUnresolvedSignedInUsername, isSignedIn, signInWithAccessToken, signOut } from '@/stores/user'
import CopilotInput from '@/components/copilot/CopilotInput.vue'
import { CopilotPanelState } from '@/components/copilot/panel-state'

type PageWrapper = Awaited<ReturnType<typeof mountPages>>['wrapper']

function getCopilot(wrapper: PageWrapper) {
  return wrapper.getComponent(CopilotInput).props('copilot')
}

function getInput(wrapper: PageWrapper) {
  return wrapper.getComponent(CopilotInput).get('textarea')
}

describe('Copilot panel across pages and sign-in changes', () => {
  setupPageTests()

  beforeEach(() => {
    vi.mocked(copilotApis.generateCopilotMessage).mockImplementation(async function* () {
      yield { type: 'text_delta', data: { text: 'I can help with that.' } }
      yield { type: 'done', data: { finishReason: 'stop' } }
    })
  })

  it.each(['/search', '/project/alice/Space'])(
    'ignores a legacy globally expanded panel when signed out at %s',
    async (path) => {
      localStorage.setItem('spx-gui-copilot-active', 'true')
      const { wrapper } = await mountPages(path)
      await flushPromises()
      expect(getCopilot(wrapper).active).toBe(false)
    }
  )

  it.each(['/', '/search', '/project/alice/Space', '/editor/alice/Space/sprites'])(
    'does not introduce Copilot to a signed-in first-time user at %s',
    async (path) => {
      await signIn()
      const { wrapper } = await mountPages(path)
      await flushPromises()
      expect(getCopilot(wrapper).active).toBe(false)
    }
  )

  it('uses local identity and restores user intent while the signed-in profile is pending', async () => {
    await signIn()
    const pendingProfile = new Promise<Awaited<ReturnType<typeof userApis.getSignedInUser>>>(() => {})
    vi.mocked(userApis.getSignedInUser).mockReturnValue(pendingProfile)
    const { wrapper } = await mountPages('/')
    await flushPromises()
    expect(userApis.getSignedInUser).toHaveBeenCalled()
    expect(getCopilot(wrapper).active).toBe(false)
    wrapper.unmount()
    await flushPromises()

    const savedPanel = new CopilotPanelState()
    savedPanel.setContext('alice', false)
    savedPanel.draft = 'Help me create a game'
    const restored = await mountPages('/')
    await flushPromises()
    expect(getCopilot(restored.wrapper).active).toBe(true)
    expect(getInput(restored.wrapper).element.value).toBe('Help me create a game')
    await restored.wrapper.get('.fold').trigger('click')
    await vi.waitFor(() => expect(getCopilot(restored.wrapper).active).toBe(false))
    restored.wrapper.unmount()
    await flushPromises()

    const collapsed = await mountPages('/')
    await flushPromises()
    expect(getCopilot(collapsed.wrapper).active).toBe(false)
    expect(getInput(collapsed.wrapper).element.value).toBe('Help me create a game')
  })

  it('waits for a missing local username before applying guest defaults or restoring another identity', async () => {
    await signIn()
    const alice = await userApis.getSignedInUser()
    const credentials = JSON.parse(localStorage.getItem('builder-user')!)
    localStorage.setItem('builder-user', JSON.stringify({ ...credentials, username: null }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    expect(isSignedIn()).toBe(true)
    expect(getUnresolvedSignedInUsername()).toBe(null)
    const pendingProfile = new Promise<Awaited<ReturnType<typeof userApis.getSignedInUser>>>(() => {})
    vi.mocked(userApis.getSignedInUser).mockImplementation((token) =>
      token === 'alice-token' ? Promise.resolve(alice) : pendingProfile
    )
    const savedPanel = new CopilotPanelState()
    savedPanel.setContext('bob', false)
    savedPanel.open('user')
    savedPanel.draft = 'Another account draft'

    const { wrapper } = await mountPages('/')
    await flushPromises()
    expect(getCopilot(wrapper).active).toBe(false)
    expect(getInput(wrapper).element.disabled).toBe(true)
    await wrapper.get('.copilot-trigger').trigger('click')
    await flushPromises()
    expect(getCopilot(wrapper).active).toBe(false)
    expect(getInput(wrapper).element.value).toBe('')
    await signInWithAccessToken('alice-token')
    await flushPromises()
    expect(getUnresolvedSignedInUsername()).toBe('alice')
    expect(getCopilot(wrapper).active).toBe(false)
    expect(getInput(wrapper).element.value).toBe('')
    expect(getInput(wrapper).element.disabled).toBe(false)
  })

  it('keeps a new guest draft when expired credentials still contain another username', async () => {
    await signIn()
    const alice = await userApis.getSignedInUser()
    const credentials = JSON.parse(localStorage.getItem('builder-user')!)
    localStorage.setItem(
      'builder-user',
      JSON.stringify({ ...credentials, accessTokenExpiresAt: Date.now() - 60_000, refreshToken: null })
    )
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    expect(isSignedIn()).toBe(false)
    expect(getUnresolvedSignedInUsername()).toBe(null)
    const { wrapper } = await mountPages('/')
    await vi.waitFor(() => expect(getCopilot(wrapper).active).toBe(true))
    await getInput(wrapper).setValue('Help me build a spaceship')

    vi.mocked(userApis.getSignedInUser).mockResolvedValue({ ...alice, username: 'bob', displayName: 'Bob' })
    await signInWithAccessToken('bob-token')
    await flushPromises()
    expect(getUnresolvedSignedInUsername()).toBe('bob')
    expect(getCopilot(wrapper).active).toBe(true)
    expect(getInput(wrapper).element.value).toBe('Help me build a spaceship')
  })

  it('ends an unused homepage introduction when leaving the homepage', async () => {
    const { wrapper, router } = await mountPages('/')
    await vi.waitFor(() => expect(getCopilot(wrapper).active).toBe(true))

    await router.push('/search')
    await flushPromises()
    expect(getCopilot(wrapper).active).toBe(false)
    await router.push('/project/alice/Space')
    await flushPromises()
    expect(getCopilot(wrapper).active).toBe(false)

    await router.push('/')
    await vi.waitFor(() => expect(getCopilot(wrapper).active).toBe(true))
  })

  it('keeps a manual collapse above draft restoration, navigation and guest sign-in', async () => {
    const { wrapper, router } = await mountPages('/')
    await vi.waitFor(() => expect(getCopilot(wrapper).active).toBe(true))
    await getInput(wrapper).setValue('Help me create a game')
    await wrapper.get('.fold').trigger('click')
    await vi.waitFor(() => expect(getCopilot(wrapper).active).toBe(false))

    await router.push('/search')
    await router.push('/')
    await flushPromises()
    expect(getCopilot(wrapper).active).toBe(false)
    wrapper.unmount()
    await flushPromises()

    const reloaded = await mountPages('/')
    await flushPromises()
    expect(getCopilot(reloaded.wrapper).active).toBe(false)
    await signIn()
    await flushPromises()
    expect(getCopilot(reloaded.wrapper).active).toBe(false)
  })

  it('keeps a manually expanded panel across navigation, reload and guest sign-in', async () => {
    const { wrapper, router } = await mountPages('/search')
    await flushPromises()
    await wrapper.get('.copilot-trigger').trigger('click')
    await vi.waitFor(() => expect(getCopilot(wrapper).active).toBe(true))

    await router.push('/project/alice/Space')
    await flushPromises()
    expect(getCopilot(wrapper).active).toBe(true)
    wrapper.unmount()
    await flushPromises()

    const reloaded = await mountPages('/project/alice/Space')
    await flushPromises()
    expect(getCopilot(reloaded.wrapper).active).toBe(true)
    await signIn()
    await flushPromises()
    expect(getCopilot(reloaded.wrapper).active).toBe(true)
  })

  it.each([
    { name: 'no interaction', drafts: [] },
    { name: 'whitespace only', drafts: ['   '] },
    { name: 'a cleared draft', drafts: ['Help me create a game', ''] }
  ])('closes an automatic introduction after sign-in with $name', async ({ drafts }) => {
    const { wrapper } = await mountPages('/')
    await vi.waitFor(() => expect(getCopilot(wrapper).active).toBe(true))
    for (const draft of drafts) await getInput(wrapper).setValue(draft)
    wrapper.unmount()
    await flushPromises()

    await signIn()
    const signedInPage = await mountPages('/')
    await flushPromises()
    expect(getCopilot(signedInPage.wrapper).active).toBe(false)
  })

  it('restores an unsent draft after a full-page sign-in return', async () => {
    const { wrapper } = await mountPages('/')
    await vi.waitFor(() => expect(getCopilot(wrapper).active).toBe(true))
    await getInput(wrapper).setValue('Help me create a game')
    wrapper.unmount()
    await flushPromises()

    await signIn()
    const signedInPage = await mountPages('/search')
    await flushPromises()
    expect(getCopilot(signedInPage.wrapper).active).toBe(true)
    expect(getInput(signedInPage.wrapper).element.value).toBe('Help me create a game')
  })

  it('preserves active use after submitting a message clears the draft', async () => {
    const { wrapper, router } = await mountPages('/')
    await vi.waitFor(() => expect(getCopilot(wrapper).active).toBe(true))
    await getInput(wrapper).setValue('Help me create a game')
    await getInput(wrapper).trigger('keypress', { key: 'Enter' })
    await vi.waitFor(() => expect(wrapper.text()).toContain('I can help with that.'))
    expect(getInput(wrapper).element.value).toBe('')

    await router.push('/search')
    await flushPromises()
    expect(getCopilot(wrapper).active).toBe(true)
    wrapper.unmount()
    await flushPromises()

    await signIn()
    const signedInPage = await mountPages('/search')
    await flushPromises()
    expect(getCopilot(signedInPage.wrapper).active).toBe(true)
  })

  it('clears the old choice and draft when signing out', async () => {
    await signIn()
    const { wrapper } = await mountPages('/search')
    await flushPromises()
    await wrapper.get('.copilot-trigger').trigger('click')
    await vi.waitFor(() => expect(getCopilot(wrapper).active).toBe(true))
    await getInput(wrapper).setValue('Private draft')

    vi.spyOn(accountOAuthApisForXBuilder, 'revokeToken').mockResolvedValue()
    await signOut()
    await flushPromises()
    expect(getCopilot(wrapper).active).toBe(false)
    expect(getInput(wrapper).element.value).toBe('')
  })

  it('clears the previous account state and conversation on account switch', async () => {
    await signIn()
    const alice = await userApis.getSignedInUser()
    const { wrapper } = await mountPages('/search')
    await flushPromises()
    await wrapper.get('.copilot-trigger').trigger('click')
    await vi.waitFor(() => expect(getCopilot(wrapper).active).toBe(true))
    await getInput(wrapper).setValue('Help me create a game')
    await getInput(wrapper).trigger('keypress', { key: 'Enter' })
    await vi.waitFor(() => expect(wrapper.text()).toContain('I can help with that.'))
    await getInput(wrapper).setValue('Private follow-up')

    vi.mocked(userApis.getSignedInUser).mockResolvedValue({ ...alice, username: 'bob', displayName: 'Bob' })
    await signInWithAccessToken('bob-token')
    await flushPromises()
    expect(getCopilot(wrapper).active).toBe(false)
    expect(getInput(wrapper).element.value).toBe('')
    expect(getCopilot(wrapper).currentSession).toBe(null)
  })
})
