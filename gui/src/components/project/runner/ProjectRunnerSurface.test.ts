import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SpxProject } from '@/models/spx/project'
import ProjectRunnerSurface from './ProjectRunnerSurface.vue'

vi.mock('./ProjectRunner.vue', () => ({
  default: { template: '<div><iframe title="Game" /></div>' }
}))
vi.mock('@/utils/exception', async (importOriginal) => {
  const { ref } = await import('vue')
  return {
    ...(await importOriginal<object>()),
    useMessageHandle: (fn: () => unknown) => ({ fn, isLoading: ref(false) })
  }
})

const disposers: Array<() => void> = []

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 0)
  )
})

afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose())
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function finishTransition() {
  await nextTick()
  await vi.advanceTimersByTimeAsync(500)
  await nextTick()
}

function mountSurface() {
  const project = new SpxProject()
  const fullscreen = ref(false)
  const runnerState = ref<'initial' | 'loading' | 'running'>('running')
  const openerDisabled = ref(false)
  const surfaceRef = ref<InstanceType<typeof ProjectRunnerSurface> | null>(null)
  const wrapper = mount(
    defineComponent({
      setup() {
        return () => [
          runnerState.value !== 'initial'
            ? h(
                'button',
                {
                  'data-test-id': 'opener',
                  disabled: openerDisabled.value,
                  onClick: (event: MouseEvent) => surfaceRef.value?.enterFullscreen(event)
                },
                'Enter fullscreen'
              )
            : null,
          h(
            ProjectRunnerSurface,
            {
              ref: surfaceRef,
              project,
              fullscreen: fullscreen.value,
              'onUpdate:fullscreen': (value) => (fullscreen.value = value),
              runnerState: runnerState.value,
              onStop: () => {
                runnerState.value = 'initial'
              }
            },
            {
              'inline-overlay': () =>
                runnerState.value === 'initial' ? h('button', { 'data-test-id': 'inline-run' }, 'Run project') : null
            }
          ),
          h('button', { 'data-test-id': 'outside' }, 'Outside')
        ]
      }
    }),
    {
      attachTo: document.body,
      global: {
        directives: { radar: {} },
        mocks: { $t: (message: { en: string }) => message.en },
        stubs: { UITooltip: { template: '<slot name="trigger" />' } }
      }
    }
  )
  disposers.push(
    () => wrapper.unmount(),
    () => project.dispose()
  )
  const surface = wrapper.getComponent(ProjectRunnerSurface)
  const container = surface.get<HTMLElement>('.runner-wrapper')

  async function enter(detail = 0) {
    const opener = wrapper.get<HTMLButtonElement>('[data-test-id="opener"]')
    opener.element.focus()
    await opener.trigger('click', { detail })
  }

  async function exit() {
    const button = surface.get<HTMLButtonElement>('.fullscreen-exit')
    button.element.focus()
    await button.trigger('click')
    await finishTransition()
  }

  return { wrapper, surface, container, fullscreen, runnerState, openerDisabled, enter, exit }
}

describe('ProjectRunnerSurface fullscreen focus', () => {
  it('moves keyboard focus into fullscreen and restores the opener on exit', async () => {
    const { wrapper, surface, container, enter, exit } = mountSurface()
    await enter()
    expect(document.activeElement).toBe(container.element)
    await finishTransition()
    expect(document.activeElement).toBe(surface.get('.toolbar-zone button').element)

    await exit()
    expect(container.classes()).not.toContain('fullscreen')
    expect(document.activeElement).toBe(wrapper.get('[data-test-id="opener"]').element)
  })

  it('keeps the toolbar unfocused when the same opener is clicked after a keyboard exit', async () => {
    const { container, enter, exit } = mountSurface()
    await enter()
    await finishTransition()
    await exit()

    await enter(1)
    await finishTransition()
    expect(document.activeElement).toBe(container.element)
  })

  it('preserves game focus acquired before the opening animation finishes', async () => {
    const { surface, enter } = mountSurface()
    await enter()
    const game = surface.get<HTMLIFrameElement>('iframe')
    game.element.focus()
    await finishTransition()
    expect(document.activeElement).toBe(game.element)
  })

  it('redirects the focus guards to enabled toolbar controls', async () => {
    const { surface, runnerState, enter } = mountSurface()
    runnerState.value = 'loading'
    await enter()
    await finishTransition()
    const buttons = surface.findAll<HTMLButtonElement>('.toolbar-zone button')
    const guards = surface.findAll<HTMLElement>('span[tabindex="0"]')
    expect(buttons[0].element.disabled).toBe(true)
    expect(document.activeElement).toBe(buttons[1].element)

    guards[0].element.focus()
    expect(document.activeElement).toBe(buttons[2].element)
    guards[1].element.focus()
    expect(document.activeElement).toBe(buttons[1].element)
  })

  it('focuses the inline run action when stopping removes the fullscreen opener', async () => {
    const { wrapper, surface, enter, exit } = mountSurface()
    await enter()
    await finishTransition()
    await surface.findAll('.toolbar-zone button')[1].trigger('click')
    expect(wrapper.find('[data-test-id="opener"]').exists()).toBe(false)

    await exit()
    expect(document.activeElement).toBe(wrapper.get('[data-test-id="inline-run"]').element)
  })

  it('falls back to the preview container when the opener becomes disabled', async () => {
    const { container, openerDisabled, enter, exit } = mountSurface()
    await enter()
    await finishTransition()
    openerDisabled.value = true
    await nextTick()

    await exit()
    expect(document.activeElement).toBe(container.element)
  })

  it('preserves focus moved outside the preview during the closing animation', async () => {
    const { wrapper, surface, container, enter } = mountSurface()
    await enter()
    await finishTransition()
    await surface.get('.fullscreen-exit').trigger('click')
    const outside = wrapper.get<HTMLButtonElement>('[data-test-id="outside"]')
    outside.element.focus()

    await finishTransition()
    expect(container.classes()).not.toContain('fullscreen')
    expect(document.activeElement).toBe(outside.element)
  })

  it('cancels pending keyboard autofocus when fullscreen closes during opening', async () => {
    const { wrapper, surface, container, fullscreen, enter } = mountSurface()
    await enter()
    fullscreen.value = false
    await finishTransition()

    expect(container.classes()).not.toContain('fullscreen')
    expect(surface.find('.toolbar-zone').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('[data-test-id="opener"]').element)
  })

  it('keeps a reopened overlay and its focus when an older close transition finishes', async () => {
    const { surface, container, enter, exit } = mountSurface()
    await enter()
    await finishTransition()
    await surface.get('.fullscreen-exit').trigger('click')
    await vi.advanceTimersByTimeAsync(100)
    await enter()
    await finishTransition()

    expect(container.classes()).toContain('fullscreen')
    expect(container.classes()).not.toContain('closing')
    expect(document.activeElement).toBe(surface.get('.toolbar-zone button').element)
    await exit()
  })
})
