import { flushPromises, shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { mockFile } from '@/models/common/test'
import { Animation, AnimationSoundPlayback } from '@/models/spx/animation'
import { Sound } from '@/models/spx/sound'
import { SpxProject } from '@/models/spx/project'
import { Sprite, State } from '@/models/spx/sprite'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import SoundItem from '@/components/editor/stage/sound/SoundItem.vue'
import { useResourceWorkspace } from '../resource-workspace'
import DurationEditor from './DurationEditor.vue'
import SoundEditor from './SoundEditor.vue'
import BoundStateEditor from './state/BoundStateEditor.vue'

vi.mock('@/components/editor/EditorContextProvider.vue', () => ({ useEditorCtx: vi.fn() }))
vi.mock('../resource-workspace', () => ({ useResourceWorkspace: vi.fn() }))
vi.mock('@/components/ui/message/UIMessageProvider.vue', () => ({ useMessage: () => ({ error: vi.fn() }) }))
vi.mock('@/components/asset', () => ({
  useAddSoundFromLocalFile: () => vi.fn(),
  useAddAssetFromLibrary: () => vi.fn(),
  useAddSoundByRecording: () => vi.fn()
}))

function setup(component: typeof DurationEditor | typeof BoundStateEditor | typeof SoundEditor, embedded: boolean) {
  const project = new SpxProject()
  const sprite = new Sprite('Cat')
  const animation = new Animation('walk', { duration: 1 })
  const sound = new Sound('step', mockFile('step.mp3'))
  sprite.addAnimation(animation)
  project.addSprite(sprite)
  project.addSound(sound)
  const doAction = vi.fn(async (_action: unknown, apply: () => void) => apply())
  vi.mocked(useEditorCtx).mockReturnValue({ project, state: { history: { doAction } } } as unknown as ReturnType<
    typeof useEditorCtx
  >)
  vi.mocked(useResourceWorkspace).mockReturnValue(embedded ? ({} as ReturnType<typeof useResourceWorkspace>) : null)
  const host = shallowMount(
    defineComponent(() => () => h(component, { animation })),
    {
      global: {
        plugins: [createI18n({ lang: 'en' })],
        renderStubDefaultSlot: true,
        stubs: {
          DurationEditor: false,
          BoundStateEditor: false,
          SoundEditor: false,
          UIDropdownForm: false,
          UIButton: false,
          UINumberInput: false,
          UIInputFrame: false,
          UIDropdown: defineComponent(
            (_, { slots }) =>
              () =>
                h('div', [slots.trigger?.(), slots.default?.()])
          ),
          UITooltip: defineComponent(
            (_, { slots }) =>
              () =>
                h('div', slots.trigger?.())
          )
        },
        directives: {
          radar: (el: HTMLElement, binding: { value: { name: string } }) =>
            el.setAttribute('aria-label', binding.value.name)
        }
      }
    }
  )
  onTestFinished(() => host.unmount())
  const wrapper = host.getComponent(component)
  expect(wrapper.find('[aria-label="Confirm button"]').exists()).toBe(true)
  expect(wrapper.find('[aria-label="Cancel button"]').exists()).toBe(true)
  expect(wrapper.find('[aria-label="Close button"]').exists()).toBe(true)
  return { wrapper, animation, sprite, sound, doAction }
}

describe.each([true, false])('Animation properties (workspace: %s)', (embedded) => {
  it.each([
    ['duration', DurationEditor],
    ['binding', BoundStateEditor],
    ['sound', SoundEditor]
  ] as const)('closes the %s panel without saving', async (_, component) => {
    const { wrapper, doAction } = setup(component, embedded)
    await wrapper.get('[aria-label="Close button"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(doAction).not.toHaveBeenCalled()
  })

  it('waits for confirmation before committing duration', async () => {
    const { wrapper, animation, doAction } = setup(DurationEditor, embedded)
    const input = wrapper.get('input')
    await input.setValue('2.5')
    await input.trigger('blur')
    expect(animation.duration).toBe(1)
    expect(doAction).not.toHaveBeenCalled()
    await wrapper.get('[aria-label="Cancel button"]').trigger('click')
    expect(animation.duration).toBe(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(animation.duration).toBe(2.5)
    expect(doAction).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('close')).toHaveLength(2)
  })

  it('waits for confirmation before committing bindings', async () => {
    const { wrapper, animation, sprite, doAction } = setup(BoundStateEditor, embedded)
    await wrapper.get('[aria-label="State step"]').trigger('click')
    expect(sprite.getAnimationBoundStates(animation.id)).toEqual([])
    expect(doAction).not.toHaveBeenCalled()
    await wrapper.get('[aria-label="Cancel button"]').trigger('click')
    expect(sprite.getAnimationBoundStates(animation.id)).toEqual([])
    expect(wrapper.emitted('close')).toHaveLength(1)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(sprite.getAnimationBoundStates(animation.id)).toEqual([State.Step])
    expect(doAction).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('close')).toHaveLength(2)
  })

  it('waits for confirmation before committing sound and playback mode', async () => {
    const { wrapper, animation, sound, doAction } = setup(SoundEditor, embedded)
    wrapper.getComponent(SoundItem).vm.$emit('click')
    await flushPromises()
    await wrapper.findAll('[role="menuitemradio"]')[1].trigger('click')
    expect(animation.sound).toBeNull()
    expect(animation.soundPlayback).toBe(AnimationSoundPlayback.Once)
    expect(doAction).not.toHaveBeenCalled()
    await wrapper.get('[aria-label="Cancel button"]').trigger('click')
    expect(animation.sound).toBeNull()
    expect(wrapper.emitted('close')).toHaveLength(1)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(animation.sound).toBe(sound.id)
    expect(animation.soundPlayback).toBe(AnimationSoundPlayback.Loop)
    expect(doAction).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('close')).toHaveLength(2)
  })
})
