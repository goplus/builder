import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SpxProject } from '@/models/spx/project'
import type { SpxLog } from './spx-log'
import ProjectRunner from './ProjectRunner.vue'

vi.mock('@/stores/user', () => ({ useSignedIn: () => ({ username: null }) }))
vi.mock('@/utils/img-rendering', async () => {
  const { ref } = await import('vue')
  return { useRenderableImageUrl: () => [ref(null), ref(false)] }
})
vi.mock('@/models/common/hash', () => ({ hashFiles: async () => 'files-hash' }))
vi.mock('@/apis/common', () => ({ client: { urlFor: (path: string) => new URL(path, 'https://api.test') } }))
vi.mock('@/components/ui', () => ({
  UIImg: { name: 'UIImg', render: () => null },
  UIDetailedLoading: { name: 'UIDetailedLoading', render: () => null }
}))

const disposers: Array<() => void> = []
afterEach(() => disposers.splice(0).forEach((dispose) => dispose()))

// The runner page is not served in tests; answer happy-dom's request for it with an empty page.
type HappyDOMFetchSettings = { interceptor: unknown }
const happyDOMFetch = (window as unknown as { happyDOM: { settings: { fetch: HappyDOMFetchSettings } } }).happyDOM
  .settings.fetch
beforeEach(() => {
  const previous = happyDOMFetch.interceptor
  happyDOMFetch.interceptor = {
    beforeAsyncRequest: async ({ request }: { request: Request }) =>
      request.url.endsWith('/runner.html')
        ? new Response('<!doctype html><html></html>', { headers: { 'Content-Type': 'text/html' } })
        : undefined
  }
  disposers.push(() => (happyDOMFetch.interceptor = previous))
})

function spxLogLine(msg: string) {
  return JSON.stringify({
    level: 'INFO',
    time: '2026-11-12T00:00:00Z',
    msg,
    function: 'main',
    file: 'main.spx',
    line: 1
  })
}

describe('ProjectRunner', () => {
  it('emits start before starting the game, so the logs the game prints while starting come after it', async () => {
    const events: string[] = []
    const wrapper = mount(ProjectRunner, {
      attachTo: document.body,
      global: { mocks: { $t: (msg: { en: string }) => msg.en } },
      props: {
        project: new SpxProject(),
        onStart: () => events.push('start'),
        onLog: (log: SpxLog) => events.push(`log ${log.msg}`)
      }
    })
    disposers.push(() => wrapper.unmount())
    const runnerWindow = wrapper.find('iframe').element.contentWindow as Window & typeof globalThis
    Object.assign(runnerWindow, {
      initEngine: async () => {},
      initGame: async () => {},
      xbuilder_set_username: () => {},
      onGameError: () => {},
      onGameExit: () => {},
      onEngineCrash: () => {},
      startGame: async () => {
        events.push('startGame')
        runnerWindow.console.log(spxLogLine('printed at the top level'))
      }
    })
    runnerWindow.dispatchEvent(new Event('runnerReady'))

    await (wrapper.vm as unknown as { run(): Promise<string> }).run()

    expect(events).toEqual(['start', 'startGame', 'log printed at the top level'])
  })
})
