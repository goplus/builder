import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { fromText } from '@/models/common/file'
import { Animation } from '@/models/spx/animation'
import { SpxProject } from '@/models/spx/project'
import { Sound } from '@/models/spx/sound'
import { provideLocalEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import SoundEditor from './SoundEditor.vue'

vi.mock('@/components/asset', () => ({
  useAddAssetFromLibrary: () => vi.fn(),
  useAddSoundByRecording: () => vi.fn(),
  useAddSoundFromLocalFile: () => vi.fn()
}))

vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exception')>()),
  useMessageHandle: (fn: unknown) => ({ fn })
}))

function mockFile(name = 'mocked') {
  return fromText(name, Math.random() + '')
}

function mountSoundEditor(animationInits?: { sound?: string | null; soundLoop?: boolean }) {
  const project = new SpxProject()
  const sound1 = new Sound('Sound01', mockFile())
  const sound2 = new Sound('Sound02', mockFile())
  project.addSound(sound1)
  project.addSound(sound2)

  const animation = new Animation('walk', {
    sound: animationInits?.sound ?? undefined,
    soundLoop: animationInits?.soundLoop ?? false
  })
  const doAction = vi.fn(async (_action, fn: () => void) => fn())
  const state = { history: { doAction } }

  const Harness = defineComponent({
    name: 'SoundEditorHarness',
    components: { SoundEditor },
    setup() {
      provideLocalEditorCtx({ project, state: state as any })
      return { animation, closed: 0 }
    },
    template: '<SoundEditor :animation="animation" @close="closed += 1" />'
  })

  const wrapper = mount(Harness, {
    global: {
      directives: {
        radar: () => {}
      },
      mocks: {
        $t: (message?: { en?: string } | string) => (typeof message === 'string' ? message : message?.en ?? '')
      },
      stubs: {
        SoundItem: {
          props: ['sound', 'selectable'],
          emits: ['click'],
          template:
            '<button class="sound-item" :data-selected="selectable && selectable.selected" @click="$emit(\'click\')">{{ sound.name }}</button>'
        },
        UIDropdown: {
          template: '<div><slot name="trigger"></slot><slot></slot></div>'
        },
        UITooltip: {
          template: '<div class="tooltip"><slot name="trigger"></slot><slot></slot></div>'
        },
        UIMenu: {
          template: '<div><slot></slot></div>'
        },
        UIMenuItem: {
          emits: ['click'],
          template: '<button type="button" @click="$emit(\'click\')"><slot></slot></button>'
        }
      }
    }
  })

  return { wrapper, animation, sounds: [sound1, sound2], doAction }
}

describe('SoundEditor', () => {
  it('hides playback selector until a sound is selected', () => {
    const { wrapper } = mountSoundEditor()

    expect(wrapper.text()).not.toContain('Playback')
  })

  it('closes without saving on cancel', async () => {
    const { wrapper, animation, doAction } = mountSoundEditor()
    const originalSound = animation.sound

    await wrapper.findAll('.sound-item')[0].trigger('click')
    const cancelButton = wrapper.findAll('button').find((button) => button.text() === 'Cancel')

    expect(cancelButton).toBeTruthy()
    await cancelButton!.trigger('click')

    expect(doAction).not.toHaveBeenCalled()
    expect(animation.sound).toBe(originalSound)
    expect((wrapper.vm as any).closed).toBe(1)
  })

  it('shows playback selector after selecting a sound', async () => {
    const { wrapper } = mountSoundEditor()

    await wrapper.findAll('.sound-item')[0].trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('Playback')
    expect(wrapper.get('.ui-select').classes()).toContain('min-w-[80px]')
    expect(wrapper.get('select').text()).toContain('One')
    expect(wrapper.get('select').text()).toContain('Loop')
    expect(wrapper.text()).toContain('Play Once')

    await wrapper.get('select').setValue('follow-animation')

    expect(wrapper.text()).toContain('Loop with Animation')
  })

  it('saves selected sound and one-shot playback on confirm', async () => {
    const { wrapper, animation, sounds, doAction } = mountSoundEditor()

    await wrapper.findAll('.sound-item')[0].trigger('click')
    await wrapper.get('select').setValue('once')
    await wrapper.get('form').trigger('submit')

    expect(doAction).toHaveBeenCalledTimes(1)
    expect(animation.sound).toBe(sounds[0].id)
    expect(animation.soundLoop).toBe(false)
    expect((wrapper.vm as any).closed).toBe(1)
  })

  it('saves selected sound and follow-animation playback on confirm', async () => {
    const { wrapper, animation, sounds, doAction } = mountSoundEditor()

    await wrapper.findAll('.sound-item')[1].trigger('click')
    await wrapper.get('select').setValue('follow-animation')
    await wrapper.get('form').trigger('submit')

    expect(doAction).toHaveBeenCalledTimes(1)
    expect(animation.sound).toBe(sounds[1].id)
    expect(animation.soundLoop).toBe(true)
    expect((wrapper.vm as any).closed).toBe(1)
  })
})
