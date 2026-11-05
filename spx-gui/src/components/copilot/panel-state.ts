import { reactive, ref } from 'vue'

export const copilotPanelStorageKey = 'builder-copilot-panel'

export type PanelOpenSource = 'user' | 'session'

type StoredPanelState = {
  username: string | null
  source: PanelOpenSource | null
  open: boolean
  draft: string
}

function initialState(username: string | null = null): StoredPanelState {
  return { username, source: null, open: false, draft: '' }
}

export class CopilotPanelState {
  private readonly state = reactive(initialState())
  private readonly activeRef = ref(false)
  private readonly suspendedRef = ref(false)
  private isHome = false

  constructor(private readonly storage: Storage = sessionStorage) {
    try {
      const saved = JSON.parse(storage.getItem(copilotPanelStorageKey) ?? 'null') as StoredPanelState | null
      if (
        saved != null &&
        (saved.username == null || typeof saved.username === 'string') &&
        (saved.source == null || saved.source === 'user' || saved.source === 'session') &&
        typeof saved.open === 'boolean' &&
        typeof saved.draft === 'string'
      ) {
        Object.assign(this.state, saved)
      }
    } catch {
      // Ignore unreadable state from an earlier page session.
    }
  }

  get active() {
    return !this.isSuspended && this.activeRef.value
  }

  get isSuspended() {
    return this.suspendedRef.value
  }

  get draft() {
    return this.isSuspended ? '' : this.state.draft
  }

  set draft(value: string) {
    if (this.isSuspended) return
    this.state.draft = value
    if (value.trim() !== '') this.updateActive()
    this.save()
  }

  setContext(username: string | null, isHome: boolean): boolean {
    const reset = this.state.username != null && this.state.username !== username
    if (reset) Object.assign(this.state, initialState(username))
    this.state.username = username
    this.isHome = isHome
    this.updateActive()
    this.suspendedRef.value = false
    this.save()
    return reset
  }

  suspendContext() {
    this.suspendedRef.value = true
  }

  open(source: PanelOpenSource = 'session') {
    if (this.isSuspended) return
    if (source === 'session' && this.active) return
    this.state.source = source
    this.state.open = true
    this.activeRef.value = true
    this.save()
  }

  close(source: PanelOpenSource = 'session') {
    if (this.isSuspended) return
    if (source === 'session' && !this.active) return
    this.state.source = source === 'user' ? source : null
    this.state.open = false
    this.activeRef.value = false
    this.save()
  }

  recordUserMessage() {
    if (this.isSuspended) return
    this.state.draft = ''
    this.open('user')
  }

  private updateActive() {
    this.activeRef.value =
      this.state.source != null
        ? this.state.open
        : this.state.draft.trim() !== '' || (this.state.username == null && this.isHome)
  }

  private save() {
    this.storage.setItem(copilotPanelStorageKey, JSON.stringify(this.state))
  }
}
