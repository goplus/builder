import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import * as dom from '@/utils/dom'
import ResourceCanvas from './ResourceCanvas.vue'
import { provideResourceCanvas } from './resource-canvas'
import ResourceTool from './ResourceTool.vue'
import ResourceWorkspace from './ResourceWorkspace.vue'

vi.mock('@/components/ui/message/UIMessageProvider.vue', () => ({ useMessage: () => ({ error: vi.fn() }) }))
vi.mock('@/components/ui/modal/UIModalProvider.vue', () => ({ useModal: () => vi.fn() }))

const DraftInput = defineComponent(() => {
  const value = ref('')
  return () =>
    h('input', {
      value: value.value,
      onInput: (event: Event) => {
        value.value = (event.target as HTMLInputElement).value
      }
    })
})

describe('ResourceWorkspace', () => {
  it.each(['costume', 'animation'] as const)(
    'keeps the %s prompt beside the preview across state changes and resizing',
    async (resourceType) => {
      const dimensions = ref<{ width: number; height: number } | null>(null)
      const size = vi.spyOn(dom, 'useContentSize').mockReturnValue(dimensions)
      onTestFinished(() => size.mockRestore())
      const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(700)
      const height = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800)
      onTestFinished(() => width.mockRestore())
      onTestFinished(() => height.mockRestore())
      const phase = ref<'empty' | 'loading' | 'decoding' | 'ready'>('empty')
      const canReview = ref(false)
      const Host = defineComponent(() => {
        provideResourceCanvas()
        return () =>
          h(
            ResourceWorkspace,
            { resourceKey: 'resource', resourceType, pending: true, canReview: canReview.value },
            {
              actions: () => h('span'),
              prompt: () => h(DraftInput),
              default: () => [
                phase.value !== 'loading'
                  ? h(
                      ResourceCanvas,
                      {
                        key: phase.value === 'empty' ? 'placeholder' : 'video',
                        resourceKey: 'resource'
                      },
                      phase.value === 'empty' || resourceType === 'costume'
                        ? {}
                        : { 'media-controls': () => (phase.value === 'ready' ? h('div', 'Timeline') : null) }
                    )
                  : null,
                phase.value === 'loading' || phase.value === 'decoding'
                  ? h(ResourceCanvas, {
                      key: 'loading',
                      resourceKey: 'resource',
                      previewOnly: true
                    })
                  : null
              ]
            }
          )
      })
      const host = mount(Host, {
        attachTo: document.body,
        global: {
          plugins: [createI18n({ lang: 'en' })],
          directives: {
            radar: (el: HTMLElement, binding: { value: { name: string } }) =>
              el.setAttribute('aria-label', binding.value.name)
          }
        }
      })
      onTestFinished(() => host.unmount())
      await nextTick()
      const tools = host.get('[aria-label="Resource tool area"]')
      const input = host.get('input').element
      const initialFrame = host.get('.select-none').attributes('style')
      const initialPosition = tools.attributes('style')
      function expectPromptBelowPreview() {
        const frame = (host.get('.select-none').element as HTMLElement).style
        const prompt = (tools.element as HTMLElement).style
        expect(prompt.width).toBe(frame.width)
        expect(parseFloat(prompt.top) - parseFloat(frame.top) - parseFloat(frame.height)).toBe(
          resourceType === 'animation' ? 88 : 24
        )
      }
      expectPromptBelowPreview()
      expect(host.find('[aria-label="ai-edit"]').exists()).toBe(false)
      phase.value = 'loading'
      await nextTick()
      expect(tools.attributes('style')).toBe(initialPosition)
      expect(host.get('.select-none').attributes('style')).toBe(initialFrame)
      dimensions.value = { width: 700, height: 1000 }
      height.mockReturnValue(1000)
      await nextTick()
      const resizedFrame = host.get('.select-none').attributes('style')
      const resizedPosition = tools.attributes('style')
      expect(resizedFrame).not.toBe(initialFrame)
      expect(resizedPosition).not.toBe(initialPosition)
      expectPromptBelowPreview()
      for (const state of ['decoding', 'ready'] as const) {
        phase.value = state
        await nextTick()
        expect(tools.attributes('style')).toBe(resizedPosition)
        expect(host.get('.select-none').attributes('style')).toBe(resizedFrame)
        expect(host.get('input').element).toBe(input)
      }
      canReview.value = true
      await nextTick()
      expect(host.get('.select-none').attributes('style')).toBe(resizedFrame)
      expect(host.get('input').element).toBe(input)
      expect(host.get('[aria-label="Resource edit actions"]').isVisible()).toBe(true)
      expect(host.get('[aria-label="Resource result tools"]').isVisible()).toBe(true)
      canReview.value = false
      await nextTick()
      expect(host.get('.select-none').attributes('style')).toBe(resizedFrame)
      if (resourceType === 'animation') {
        const frameStyle = (host.get('.select-none').element as HTMLElement).style
        const controlsStyle = (host.get('[aria-label="Resource preview controls"]').element as HTMLElement).style
        expect(parseFloat(controlsStyle.top)).toBeGreaterThan(
          parseFloat(frameStyle.top) + parseFloat(frameStyle.height)
        )
      }
    }
  )

  it.each(['costume', 'animation'] as const)(
    'opens %s editing explicitly and keeps generation open without a selection frame',
    async (resourceType) => {
      const size = vi.spyOn(dom, 'useContentSize').mockReturnValue(ref({ width: 700, height: 800 }))
      onTestFinished(() => size.mockRestore())
      const resourceKey = ref('first')
      const pending = ref(false)
      const busy = ref(false)
      const selectionLocked = ref(false)
      const Host = defineComponent(() => {
        provideResourceCanvas()
        return () =>
          h(
            ResourceWorkspace,
            {
              resourceKey: resourceKey.value,
              resourceType,
              pending: pending.value,
              canReview: true,
              busy: busy.value,
              selectionLocked: selectionLocked.value
            },
            {
              actions: () => h('button', 'Keep'),
              prompt: () => h(DraftInput),
              default: () =>
                h(
                  ResourceCanvas,
                  { resourceKey: resourceKey.value, mediaSize: { width: 512, height: 512 } },
                  {
                    default: () => h('img', { alt: 'Preview' })
                  }
                )
            }
          )
      })
      const host = mount(Host, {
        attachTo: document.body,
        global: {
          plugins: [createI18n({ lang: 'en' })],
          directives: {
            radar: (el: HTMLElement, binding: { value: { name: string } }) =>
              el.setAttribute('aria-label', binding.value.name)
          }
        }
      })
      onTestFinished(() => host.unmount())
      await nextTick()
      const panel = host.get('[aria-label="Resource tool panel ai"]')
      const input = panel.get('input')
      const frame = host.get('img').element.parentElement!.parentElement!
      const frameStyle = frame.getAttribute('style')
      expect(host.find('[aria-label="AI workspace header"]').exists()).toBe(false)
      expect(panel.find('[aria-label="Close resource workspace"]').exists()).toBe(false)
      expect(panel.isVisible()).toBe(false)
      expect(host.find('[aria-label="Select resource"]').exists()).toBe(false)
      host.getComponent(ResourceWorkspace).vm.openAIEditor()
      await nextTick()
      expect(panel.isVisible()).toBe(true)
      await input.setValue('Keep this instruction')
      await input.trigger('pointerdown')
      expect(panel.isVisible()).toBe(true)
      expect(host.find('.border-primary-main').exists()).toBe(false)
      busy.value = true
      await nextTick()
      await host.get('[aria-label="Resource preview"]').trigger('pointerdown')
      await host.getComponent(ResourceWorkspace).trigger('pointerdown')
      expect(panel.isVisible()).toBe(true)
      expect(frame.getAttribute('style')).toBe(frameStyle)
      busy.value = false
      selectionLocked.value = true
      await nextTick()
      await host.get('[aria-label="Resource preview"]').trigger('pointerdown')
      await host.getComponent(ResourceWorkspace).trigger('pointerdown')
      expect(panel.isVisible()).toBe(true)
      expect(input.element.value).toBe('Keep this instruction')
      selectionLocked.value = false
      await nextTick()
      await input.trigger('blur')
      await host.get('[aria-label="Resource preview"]').trigger('pointerdown')
      await host.getComponent(ResourceWorkspace).trigger('pointerdown')
      expect(panel.isVisible()).toBe(true)
      expect(host.get('[aria-label="Resource edit actions"]').isVisible()).toBe(true)
      expect(frame.getAttribute('style')).toBe(frameStyle)
      await host.get('img').trigger('click')
      expect(panel.isVisible()).toBe(true)
      expect(panel.get('input').element).toBe(input.element)
      expect(input.element.value).toBe('Keep this instruction')
      expect(frame.getAttribute('style')).toBe(frameStyle)
      await host.get('[aria-label="Resource preview"]').trigger('pointerdown')
      resourceKey.value = 'second'
      await nextTick()
      expect(host.get('[aria-label="Resource tool panel ai"]').isVisible()).toBe(false)
      pending.value = true
      await nextTick()
      await host.get('[aria-label="Resource preview"]').trigger('pointerdown')
      await host.getComponent(ResourceWorkspace).trigger('pointerdown')
      expect(host.get('[aria-label="Resource tool panel ai"]').isVisible()).toBe(true)
      expect(host.find('.border-primary-main').exists()).toBe(false)
    }
  )

  it.each([true, false])('preserves drafts when switching tools (pending: %s)', async (pending) => {
    const host = mount(ResourceWorkspace, {
      attachTo: document.body,
      props: { resourceKey: 'animation-1', pending },
      slots: {
        actions: () => h('span'),
        prompt: () => h(DraftInput),
        default: () =>
          h(
            ResourceTool,
            { tool: 'duration', label: 'Duration', icon: 'timer' },
            {
              default: () => h(DraftInput)
            }
          )
      },
      global: {
        plugins: [createI18n({ lang: 'en' })],
        directives: {
          radar: (el: HTMLElement, binding: { value: { name: string } }) =>
            el.setAttribute('aria-label', binding.value.name)
        }
      }
    })
    onTestFinished(() => host.unmount())
    await nextTick()
    const ai = host.get('[data-resource-tool="ai"]')
    const duration = host.get('[data-resource-tool="duration"]')
    const panel = (tool: typeof ai) => host.get(`#${tool.attributes('aria-controls')}`)

    if (!pending) {
      expect(panel(ai).isVisible()).toBe(false)
      host.vm.openAIEditor()
      await nextTick()
    }
    expect(ai.attributes('aria-selected')).toBe('true')
    expect(ai.text()).toBe(pending ? 'AI generate' : 'AI edit')
    expect(host.find('[aria-label="Resource tool panel ai"] [aria-label="Close resource workspace"]').exists()).toBe(
      !pending
    )
    expect(panel(ai).find('footer').exists()).toBe(false)
    await panel(ai).get('input').setValue('Make it blue')
    await ai.trigger('click')
    expect(panel(ai).isVisible()).toBe(true)
    await host.setProps({ selectionLocked: true })
    expect(host.find('[aria-label="Resource tool panel ai"] [aria-label="Close resource workspace"]').exists()).toBe(
      !pending
    )
    await host.setProps({ busy: true })
    expect(host.find('[aria-label="Resource tool panel ai"] [aria-label="Close resource workspace"]').exists()).toBe(
      false
    )
    await host.setProps({ busy: false })
    await host.trigger('pointerdown')
    expect(panel(ai).isVisible()).toBe(true)
    await host.setProps({ selectionLocked: false })
    if (!pending) {
      await host.get('[aria-label="Resource tool panel ai"] [aria-label="Close resource workspace"]').trigger('click')
      expect(panel(ai).isVisible()).toBe(false)
      expect(ai.attributes('aria-selected')).toBe('false')
      expect(ai.attributes('tabindex')).toBe('0')
      await ai.trigger('click')
      expect(panel(ai).isVisible()).toBe(true)
    }
    expect(panel(ai).get('input').element.value).toBe('Make it blue')

    await duration.trigger('click')
    expect(duration.attributes('aria-selected')).toBe('true')
    expect(ai.attributes('aria-selected')).toBe('false')
    expect(panel(ai).isVisible()).toBe(false)
    await panel(duration).get('input').setValue('2.5')
    await ai.trigger('click')
    expect(panel(ai).get('input').element.value).toBe('Make it blue')
    await duration.trigger('click')
    expect(panel(duration).get('input').element.value).toBe('2.5')

    await duration.trigger('keydown', { key: 'Home' })
    expect(document.activeElement).toBe(ai.element)
    await ai.trigger('keydown', { key: 'Enter' })
    expect(panel(ai).isVisible()).toBe(true)
    await duration.trigger('click')
    await host.setProps({ resourceKey: 'animation-2' })
    expect(ai.attributes('aria-selected')).toBe('true')
    expect(panel(ai).get('input').element.value).toBe('')
  })

  it('hides a single-tool group and returns to AI when the selected tool is removed', async () => {
    const showDuration = ref(false)
    const host = mount(ResourceWorkspace, {
      attachTo: document.body,
      slots: {
        actions: () => h('span'),
        prompt: () => h(DraftInput),
        default: () =>
          showDuration.value ? h(ResourceTool, { tool: 'duration', label: 'Duration', icon: 'timer' }) : null
      },
      global: {
        plugins: [createI18n({ lang: 'en' })],
        directives: {
          radar: (el: HTMLElement, binding: { value: { name: string } }) =>
            el.setAttribute('aria-label', binding.value.name)
        }
      }
    })
    onTestFinished(() => host.unmount())
    await nextTick()
    host.vm.openAIEditor()
    await nextTick()
    const aiPanel = () => host.get('[aria-label="Resource tool panel ai"]')
    expect(host.find('[role="tablist"]').exists()).toBe(false)
    expect(host.find('[aria-label="Close resource workspace"]').exists()).toBe(true)
    expect(aiPanel().isVisible()).toBe(true)
    await aiPanel().get('input').setValue('Keep the pose')
    const input = aiPanel().get('input').element

    showDuration.value = true
    await nextTick()
    await host.get('[data-resource-tool="duration"]').trigger('click')
    expect(aiPanel().isVisible()).toBe(false)
    await host
      .get('[aria-label="Resource tool panel duration"] [aria-label="Close resource workspace"]')
      .trigger('click')
    showDuration.value = false
    await nextTick()
    expect(host.find('[role="tablist"]').exists()).toBe(false)
    expect(host.find('[aria-label="Close resource workspace"]').exists()).toBe(true)
    expect(aiPanel().isVisible()).toBe(true)
    expect(aiPanel().get('input').element).toBe(input)
    expect(input.value).toBe('Keep the pose')
  })

  it('opens from the bottom entry and restores it when closing, without losing the draft', async () => {
    const host = mount(ResourceWorkspace, {
      attachTo: document.body,
      props: { resourceKey: 'saved-costume' },
      slots: { actions: () => h('span'), prompt: () => h(DraftInput) },
      global: {
        plugins: [createI18n({ lang: 'en' })],
        directives: {
          radar: (el: HTMLElement, binding: { value: { name: string } }) =>
            el.setAttribute('aria-label', binding.value.name)
        }
      }
    })
    onTestFinished(() => host.unmount())
    await nextTick()
    const panel = host.get('[aria-label="Resource tool panel ai"]')
    expect(panel.isVisible()).toBe(false)
    await host.get('[aria-label="ai-edit"]').trigger('click')
    expect(panel.isVisible()).toBe(true)
    expect(host.find('[aria-label="ai-edit"]').exists()).toBe(false)
    const input = panel.get('input')
    expect(document.activeElement).toBe(input.element)
    await input.setValue('Keep the pose')
    await input.trigger('blur')
    await host.trigger('pointerdown')
    expect(panel.isVisible()).toBe(true)
    expect(host.find('[aria-label="ai-edit"]').exists()).toBe(false)
    await host.get('[aria-label="Close resource workspace"]').trigger('click')
    expect(panel.isVisible()).toBe(false)
    await host.get('[aria-label="ai-edit"]').trigger('click')
    expect(panel.get('input').element).toBe(input.element)
    expect(input.element.value).toBe('Keep the pose')
    expect(document.activeElement).toBe(input.element)
  })

  it('keeps adopted animation properties available without an AI editor', async () => {
    const host = mount(ResourceWorkspace, {
      attachTo: document.body,
      props: { resourceKey: 'adopted-animation', aiEnabled: false },
      slots: {
        actions: () => h('span'),
        default: () =>
          ['duration', 'binding', 'sound'].map((tool) =>
            h(ResourceTool, { tool, label: tool, icon: 'timer' }, { default: () => h(DraftInput) })
          )
      },
      global: {
        plugins: [createI18n({ lang: 'en' })],
        directives: {
          radar: (el: HTMLElement, binding: { value: { name: string } }) =>
            el.setAttribute('aria-label', binding.value.name)
        }
      }
    })
    onTestFinished(() => host.unmount())
    await nextTick()
    expect(host.find('[aria-label="ai-edit"]').exists()).toBe(false)
    expect(host.find('[data-resource-tool="ai"]').exists()).toBe(false)
    expect(host.find('[aria-label="Resource tool panel ai"]').exists()).toBe(false)
    const duration = host.get('[data-resource-tool="duration"]')
    expect(duration.attributes('tabindex')).toBe('0')
    await host.trigger('pointerdown')
    expect(host.get('[role="tablist"]').isVisible()).toBe(true)
    await duration.trigger('click')
    expect(host.get('[aria-label="Resource tool panel duration"]').isVisible()).toBe(true)
    await host.get('[aria-label="Resource tool panel duration"] input').setValue('2.5')
    await host.trigger('pointerdown')
    expect(host.get('[role="tablist"]').isVisible()).toBe(true)
    expect(host.get('[aria-label="Resource tool panel duration"]').isVisible()).toBe(true)
    expect(host.get<HTMLInputElement>('[aria-label="Resource tool panel duration"] input').element.value).toBe('2.5')
    await host.get('[data-resource-tool="sound"]').trigger('click')
    expect(host.get('[aria-label="Resource tool panel duration"]').isVisible()).toBe(false)
    await host.get('[aria-label="Resource tool panel sound"] [aria-label="Close resource workspace"]').trigger('click')
    expect(host.get('[aria-label="Resource tool panel sound"]').isVisible()).toBe(false)
    await host.setProps({ resourceKey: 'new-animation', aiEnabled: true, pending: true })
    expect(host.get('[data-resource-tool="ai"]').text()).toBe('AI generate')
    expect(host.get('[aria-label="Resource tool panel ai"]').isVisible()).toBe(true)
  })
})
