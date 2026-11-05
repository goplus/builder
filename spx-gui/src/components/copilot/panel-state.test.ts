import { beforeEach, describe, expect, it } from 'vitest'
import { computed } from 'vue'
import { CopilotPanelState, copilotPanelStorageKey } from './panel-state'

describe('CopilotPanelState', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('only introduces Copilot to guests on the homepage', () => {
    const state = new CopilotPanelState()
    state.setContext(null, false)
    expect(state.active).toBe(false)
    state.setContext(null, true)
    expect(state.active).toBe(true)
    state.setContext(null, false)
    expect(state.active).toBe(false)
    state.setContext('alice', true)
    expect(state.active).toBe(false)
  })

  it('does not restore an automatic introduction on another page or after login', () => {
    const state = new CopilotPanelState()
    state.setContext(null, true)

    const restored = new CopilotPanelState()
    restored.setContext(null, false)
    expect(restored.active).toBe(false)
    restored.setContext('alice', true)
    expect(restored.active).toBe(false)
  })

  it('preserves a manual opening through navigation, reload and guest login', () => {
    const state = new CopilotPanelState()
    state.setContext(null, true)
    state.open('user')
    state.setContext(null, false)
    expect(state.active).toBe(true)

    const restored = new CopilotPanelState()
    expect(restored.setContext('alice', false)).toBe(false)
    expect(restored.active).toBe(true)
  })

  it('gives manual closing priority over a saved draft and homepage introduction', () => {
    const state = new CopilotPanelState()
    state.setContext(null, true)
    state.draft = 'Help me build a game'
    state.close('user')
    state.setContext(null, false)
    state.setContext(null, true)
    expect(state.active).toBe(false)

    const restored = new CopilotPanelState()
    restored.setContext('alice', true)
    expect(restored.active).toBe(false)
    expect(restored.draft).toBe('Help me build a game')
    restored.open('user')
    expect(restored.active).toBe(true)
  })

  it('restores a valid draft after navigation and the full-page login round trip', () => {
    const state = new CopilotPanelState()
    state.setContext(null, true)
    state.draft = '  Explain this game  '
    state.setContext(null, false)
    expect(state.active).toBe(true)

    const restored = new CopilotPanelState()
    restored.setContext('alice', false)
    expect(restored.active).toBe(true)
    expect(restored.draft).toBe('  Explain this game  ')
  })

  it('keeps the input available after clearing a draft until the next page change', () => {
    const state = new CopilotPanelState()
    state.setContext(null, true)
    state.draft = 'A question'
    state.setContext(null, false)
    expect(state.active).toBe(true)
    state.draft = ''
    expect(state.active).toBe(true)
    state.setContext(null, false)
    expect(state.active).toBe(false)
  })

  it('does not count whitespace or a cleared draft as continued use', () => {
    const state = new CopilotPanelState()
    state.setContext(null, true)
    state.draft = 'A question'
    state.draft = '  '
    state.setContext('alice', false)
    expect(state.active).toBe(false)

    const restored = new CopilotPanelState()
    restored.setContext('alice', false)
    expect(restored.active).toBe(false)
  })

  it('keeps a user-initiated conversation open and clears its submitted draft', () => {
    const state = new CopilotPanelState()
    state.setContext(null, true)
    state.draft = 'A question'
    state.recordUserMessage()
    expect(state.draft).toBe('')

    const restored = new CopilotPanelState()
    restored.setContext('alice', false)
    expect(restored.active).toBe(true)
    restored.close('user')
    expect(restored.active).toBe(false)
  })

  it.each([null, 'bob'])('clears the old identity on a change from alice to %s', (username) => {
    const state = new CopilotPanelState()
    state.setContext('alice', false)
    state.open('user')
    state.draft = 'Alice draft'

    expect(state.setContext(username, false)).toBe(true)
    expect(state.active).toBe(false)
    expect(state.draft).toBe('')
    expect(state.setContext(username, false)).toBe(false)

    const restored = new CopilotPanelState()
    expect(restored.setContext(username, false)).toBe(false)
    expect(restored.active).toBe(false)
    expect(restored.draft).toBe('')
  })

  it('detects an identity mismatch when restoring a page', () => {
    const state = new CopilotPanelState()
    state.setContext('alice', false)
    state.open('user')
    state.draft = 'Alice draft'

    const restored = new CopilotPanelState()
    expect(restored.setContext('bob', false)).toBe(true)
    expect(restored.active).toBe(false)
    expect(restored.draft).toBe('')
  })

  it('waits for identity context before displaying a saved panel', () => {
    const state = new CopilotPanelState()
    state.setContext('alice', false)
    state.open('user')
    state.draft = 'Alice draft'

    const restored = new CopilotPanelState()
    expect(restored.active).toBe(false)
    expect(restored.setContext('bob', false)).toBe(true)
    expect(restored.active).toBe(false)
    expect(restored.draft).toBe('')
  })

  it('hides and protects a saved draft while identity is unresolved', () => {
    const state = new CopilotPanelState()
    state.setContext('alice', false)
    state.open('user')
    state.draft = 'Alice draft'
    const saved = sessionStorage.getItem(copilotPanelStorageKey)
    const active = computed(() => state.active)
    const draft = computed(() => state.draft)

    state.suspendContext()
    expect(state.isSuspended).toBe(true)
    expect(active.value).toBe(false)
    expect(draft.value).toBe('')
    state.open('user')
    state.open()
    state.draft = 'Replacement draft'
    state.close('user')
    state.recordUserMessage()
    expect(active.value).toBe(false)
    expect(draft.value).toBe('')
    expect(sessionStorage.getItem(copilotPanelStorageKey)).toBe(saved)

    expect(state.setContext('alice', false)).toBe(false)
    expect(state.isSuspended).toBe(false)
    expect(active.value).toBe(true)
    expect(draft.value).toBe('Alice draft')
  })

  it('clears the suspended account state only after another identity is confirmed', () => {
    const state = new CopilotPanelState()
    state.setContext('alice', false)
    state.open('user')
    state.draft = 'Alice draft'
    const restored = new CopilotPanelState()
    restored.suspendContext()

    expect(restored.setContext('bob', false)).toBe(true)
    expect(restored.isSuspended).toBe(false)
    expect(restored.active).toBe(false)
    expect(restored.draft).toBe('')
  })

  it('resumes explicit business openings without treating them as homepage introductions', () => {
    const state = new CopilotPanelState()
    state.setContext('alice', false)
    state.close('user')
    state.open()
    expect(state.active).toBe(true)

    const restored = new CopilotPanelState()
    restored.setContext('alice', false)
    expect(restored.active).toBe(true)
    restored.close()
    expect(restored.active).toBe(false)
  })

  it('does not turn a repeated business opening into a durable user or session choice', () => {
    const state = new CopilotPanelState()
    state.setContext(null, true)
    state.open()
    state.setContext(null, false)
    expect(state.active).toBe(false)

    state.setContext(null, true)
    state.draft = 'A question'
    state.open()
    state.draft = ''
    state.setContext('alice', false)
    expect(state.active).toBe(false)
  })

  it('does not treat business closing as a manual choice against homepage introductions', () => {
    const state = new CopilotPanelState()
    state.setContext(null, false)
    state.open()
    state.close()
    expect(state.active).toBe(false)
    state.setContext(null, true)
    expect(state.active).toBe(true)
  })

  it('ignores the old shared local-storage visibility and starts a new page session by default', () => {
    localStorage.setItem('spx-gui-copilot-active', 'true')
    const state = new CopilotPanelState()
    state.setContext('alice', false)
    expect(state.active).toBe(false)
    state.open('user')
    sessionStorage.clear()

    const nextVisit = new CopilotPanelState()
    nextVisit.setContext('alice', false)
    expect(nextVisit.active).toBe(false)
  })

  it('exposes reactive visibility and draft getters', () => {
    const state = new CopilotPanelState()
    state.setContext('alice', false)
    const active = computed(() => state.active)
    const draft = computed(() => state.draft)
    expect(active.value).toBe(false)
    expect(draft.value).toBe('')
    state.draft = 'A question'
    expect(active.value).toBe(true)
    expect(draft.value).toBe('A question')
    state.close('user')
    expect(active.value).toBe(false)
  })

  it('discards an unreadable saved state', () => {
    sessionStorage.setItem(copilotPanelStorageKey, '{broken')
    const state = new CopilotPanelState()
    state.setContext('alice', false)
    expect(state.active).toBe(false)
    expect(state.draft).toBe('')
  })
})
