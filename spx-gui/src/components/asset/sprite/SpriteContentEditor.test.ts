import { flushPromises, shallowMount } from '@vue/test-utils'
import { defineComponent, h, shallowRef } from 'vue'
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { Cancelled, DefaultException } from '@/utils/exception'
import { createI18n } from '@/utils/i18n'
import { mockFile } from '@/models/common/test'
import { Animation } from '@/models/spx/animation'
import { Costume } from '@/models/spx/costume'
import { AnimationGen } from '@/models/spx/gen/animation-gen'
import { CostumeGen } from '@/models/spx/gen/costume-gen'
import { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { Phase } from '@/models/spx/gen/common'
import { SpriteEdit } from '@/models/spx/edit/sprite-edit'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import CostumeGenItem from '../gen/costume/CostumeGenItem.vue'
import AnimationGenItem from '../gen/animation/AnimationGenItem.vue'
import CostumeSettingsInput from '../gen/costume/CostumeSettingsInput.vue'
import AnimationSettingsInput from '../gen/animation/AnimationSettingsInput.vue'
import ReferenceImageInput from '../gen/common/ReferenceImageInput.vue'
import CostumeEditInput from './CostumeEditInput.vue'
import AnimationEditInput from './AnimationEditInput.vue'
import SpriteEditModal from '../edit/sprite/SpriteEditModal.vue'
import SpriteGenPhaseContent from '../gen/sprite/SpriteGenPhaseContent.vue'
import SpriteContentEditor from './SpriteContentEditor.vue'

const { messageError, openModal } = vi.hoisted(() => ({ messageError: vi.fn(), openModal: vi.fn() }))

vi.mock('@/components/ui/message/UIMessageProvider.vue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui/message/UIMessageProvider.vue')>()),
  useMessage: () => ({ error: messageError, success: vi.fn() })
}))

vi.mock('@/components/ui/modal/UIModalProvider.vue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui/modal/UIModalProvider.vue')>()),
  useModal: () => openModal
}))

vi.mock('@/components/editor/editor-state', () => ({
  EditorState: class {
    dispose() {}
  }
}))

vi.mock('@/stores/user', () => ({ useSignedInStateQuery: () => ({}) }))

type Mode = 'generate' | 'edit'

function setup<T extends Mode>(mode: T) {
  const i18n = createI18n({ lang: 'zh' })
  const project = new SpxProject()
  const source = new Sprite('Cat')
  source.addCostume(new Costume('idle', mockFile('idle.png')))
  const animation = new Animation('walk')
  animation.setCostumes([new Costume('walk-frame', mockFile('walk.png'))])
  source.addAnimation(animation)
  project.addSprite(source)
  const edit =
    mode === 'edit'
      ? SpriteEdit.fromSprite(i18n, project, source)
      : new SpriteGen(i18n, project, { settings: { name: 'NewCat' } })
  if (edit instanceof SpriteGen) {
    const costume = source.costumes[0].clone(true)
    const animation = source.animations[0].clone(true)
    edit.previewSprite.addCostume(costume)
    edit.previewSprite.addAnimation(animation)
    edit.costumes.push(
      new CostumeGen(i18n, edit, project, {
        settings: { name: costume.name },
        image: costume.img,
        finishPhase: new Phase({ en: 'save', zh: '保存' }, { status: 'finished', result: costume })
      })
    )
    edit.animations.push(
      new AnimationGen(i18n, edit, project, {
        settings: { name: animation.name },
        finishPhase: new Phase({ en: 'save', zh: '保存' }, { status: 'finished', result: animation })
      })
    )
    vi.spyOn(edit, 'recordAdoption').mockResolvedValue()
  }
  const apply = vi.fn(async (item: { type: 'costume' | 'animation'; id: string }) => {
    if (edit instanceof SpriteEdit) edit.applyToSprite(source, item)
  })
  const host = shallowMount(
    defineComponent(
      () => () =>
        edit instanceof SpriteEdit
          ? h(SpriteEditModal, { visible: true, edit, apply })
          : h(SpriteGenPhaseContent, { gen: edit })
    ),
    {
      global: {
        plugins: [i18n],
        renderStubDefaultSlot: true,
        stubs: {
          SpriteEditModal: false,
          SpriteGenPhaseContent: false,
          SpriteContentEditor: false,
          CostumeEditInput: false,
          CostumeSettingsInput: false,
          AnimationEditInput: false,
          AnimationSettingsInput: false,
          CostumeGenPreview: defineComponent(
            (_, { slots }) =>
              () =>
                h('div', [slots.leading?.(), slots.ops?.()])
          ),
          AnimationGenPreview: defineComponent(
            (_, { slots }) =>
              () =>
                h('div', [slots.leading?.(), slots.ops?.()])
          ),
          SettingsInput: false,
          UIButton: false,
          UITooltip: defineComponent(
            (_, { slots }) =>
              () =>
                h('div', slots.trigger?.())
          )
        },
        directives: {
          radar: (element: HTMLElement, binding: { value: { name: string } }) => {
            element.setAttribute('aria-label', binding.value.name)
          }
        }
      }
    }
  )
  const wrapper = host.getComponent(SpriteContentEditor)
  const parent =
    edit instanceof SpriteEdit ? host.getComponent(SpriteEditModal) : host.getComponent(SpriteGenPhaseContent)
  onTestFinished(() => {
    host.unmount()
    edit.dispose()
    project.dispose()
  })
  return { wrapper, parent, edit: edit as T extends 'edit' ? SpriteEdit : SpriteGen, source, apply }
}

beforeEach(() => {
  vi.clearAllMocks()
  openModal.mockReset().mockResolvedValue(undefined)
})

describe('Sprite generation adoption', () => {
  it('allows adopting saved content without requiring another change', async () => {
    const { wrapper, parent, edit } = setup('generate')
    const finish = vi.spyOn(edit, 'finish')
    const submit = wrapper.get('button[aria-label="Use"]')
    expect(submit.attributes('disabled')).toBeUndefined()
    await submit.trigger('click')
    await flushPromises()

    expect(openModal).not.toHaveBeenCalled()
    expect(finish).toHaveBeenCalledTimes(1)
    expect(parent.emitted('resolved')).toHaveLength(1)
  })

  it('confirms unfinished content before adopting only saved results', async () => {
    const { wrapper, parent, edit, source } = setup('generate')
    const costume = edit.costumes[0]
    const candidate = mockFile('pending.png')
    costume.setImage(candidate)
    vi.spyOn(costume, 'generateState', 'get').mockReturnValue({ status: 'finished', result: candidate })
    edit.animations[0].setVideo(mockFile('pending.mp4'))
    edit.addAnimation().setVideo(mockFile('new-pending.mp4'))
    const finish = vi.spyOn(edit, 'finish')
    let confirm: () => void = () => {}
    openModal.mockReturnValueOnce(new Promise<void>((resolve) => (confirm = resolve)))
    await wrapper.vm.$nextTick()

    const submit = wrapper.get('button[aria-label="Use"]')
    expect(submit.attributes('disabled')).toBeUndefined()
    await submit.trigger('click')
    expect(openModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '采用精灵',
        content: expect.stringContaining('造型（idle）和动画（walk'),
        cancelText: '返回',
        confirmText: '仍要采用'
      })
    )
    expect(finish).not.toHaveBeenCalled()
    expect(parent.emitted('resolved')).toBeUndefined()

    confirm()
    await flushPromises()
    expect(finish).toHaveBeenCalledTimes(1)
    const result = parent.emitted<[Sprite]>('resolved')![0][0]
    onTestFinished(() => result.dispose())
    expect(result.costumes).toHaveLength(1)
    expect(result.costumes[0].img).toBe(source.costumes[0].img)
    expect(result.animations).toHaveLength(1)
    expect(result.animations[0].costumes[0].img).toBe(source.animations[0].costumes[0].img)
  })

  it('preserves unfinished content and instructions when adoption is cancelled', async () => {
    const { wrapper, parent, edit } = setup('generate')
    const animation = edit.animations[0]
    const video = mockFile('pending.mp4')
    animation.setVideo(video)
    await wrapper.get('textarea').setValue('把衣服改成蓝色')
    const finish = vi.spyOn(edit, 'finish')
    openModal.mockRejectedValueOnce(new Cancelled())
    await wrapper.get('button[aria-label="Use"]').trigger('click')
    await flushPromises()

    expect(openModal).toHaveBeenCalledTimes(1)
    expect(finish).not.toHaveBeenCalled()
    expect(parent.emitted('resolved')).toBeUndefined()
    expect(animation.video).toBe(video)
    expect(animation.hasPendingVideo).toBe(true)
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('把衣服改成蓝色')
    expect(messageError).not.toHaveBeenCalled()
  })

  it.each(['running', 'failed'] as const)('asks for confirmation when generation is %s', async (status) => {
    const { wrapper, edit } = setup('generate')
    vi.spyOn(edit.costumes[0], 'generateState', 'get').mockReturnValue(
      status === 'running'
        ? { status, timeLeft: null }
        : { status, error: new DefaultException({ en: 'Unavailable', zh: '服务不可用' }) }
    )
    const finish = vi.spyOn(edit, 'finish')
    openModal.mockRejectedValueOnce(new Cancelled())
    await wrapper.vm.$nextTick()
    const submit = wrapper.get('button[aria-label="Use"]')
    expect(submit.attributes('disabled')).toBeUndefined()
    await submit.trigger('click')
    await flushPromises()

    expect(openModal).toHaveBeenCalledTimes(1)
    expect(finish).not.toHaveBeenCalled()
  })
})

describe('Existing sprite resource actions', () => {
  it.each(['costume', 'animation'] as const)('applies only changed %s content', async (type) => {
    const { wrapper, edit, apply } = setup('edit')
    const gen = type === 'costume' ? edit.costumes[0] : edit.animations[0]
    edit.setSelectedItem({ type, id: gen.id })
    await wrapper.vm.$nextTick()
    const button = wrapper.get('button[aria-label="Apply resource"]')
    expect(button.attributes('disabled')).toBeDefined()
    gen.setName('renamed')
    await wrapper.vm.$nextTick()
    expect(button.attributes('disabled')).toBeUndefined()
    await button.trigger('click')
    await flushPromises()
    expect(apply).toHaveBeenCalledOnce()
    expect(button.attributes('disabled')).toBeDefined()
  })

  it.each(['costume', 'animation'] as const)('can remove a newly added %s through its menu', async (type) => {
    const { wrapper, edit, source } = setup('edit')
    const gen = type === 'costume' ? edit.addCostume() : edit.addAnimation()
    edit.setSelectedItem({ type, id: gen.id })
    await wrapper.vm.$nextTick()
    const items =
      type === 'costume' ? wrapper.findAllComponents(CostumeGenItem) : wrapper.findAllComponents(AnimationGenItem)
    const item = items.find((item) => item.props().gen.id === gen.id)!
    expect(item.props().operable).toBeTruthy()
    item.vm.$emit('remove')
    await flushPromises()
    expect(type === 'costume' ? edit.getCostumeById(gen.id) : edit.getAnimationById(gen.id)).toBeNull()
    expect(source.costumes).toHaveLength(1)
    expect(source.animations).toHaveLength(1)
    expect(edit.hasPendingChanges).toBe(false)
  })
})

describe.each<Mode>(['generate', 'edit'])('Sprite content editing (%s)', (mode) => {
  it('undoes and redoes only the selected resource before adoption', async () => {
    const { wrapper, edit, source } = setup(mode)
    const gen = edit.costumes[0]
    edit.editHistory.record(gen)
    gen.setName('newName')
    await wrapper.vm.$nextTick()
    await wrapper.get('button[aria-label="Undo edit"]').trigger('click')
    expect(edit.costumes[0].name).toBe('idle')
    expect(source.costumes[0].name).toBe('idle')
    expect(wrapper.find('button[aria-label="Apply resource"]').exists()).toBe(true)
    expect(wrapper.get('button[aria-label="Discard changes"]').text()).toBe('放弃修改')
    await wrapper.get('button[aria-label="Redo edit"]').trigger('click')
    expect(edit.costumes[0].name).toBe('newName')
    expect(source.costumes[0].name).toBe('idle')
    expect(wrapper.find('button[aria-label="Discard changes"]').exists()).toBe(true)
    await wrapper.get('button[aria-label="Apply resource"]').trigger('click')
    await flushPromises()
    expect(edit.editHistory.canUndo(gen.id)).toBe(false)
    expect(edit.editHistory.canRedo(gen.id)).toBe(false)
    if (mode === 'generate') expect(wrapper.find('button[aria-label="Use"]').exists()).toBe(true)
  })

  it.each([0, 1, 2])('discards only the current animation edits after %i undo steps', async (undoSteps) => {
    const { wrapper, edit, source, apply } = setup(mode)
    const originalAnimation = source.animations[0]
    const costume = edit.costumes[0]
    edit.editHistory.record(costume)
    costume.setName('edited-costume')
    const gen = edit.addAnimation()
    const originalVideo = mockFile('original.mp4')
    const firstEdit = mockFile('first-edit.mp4')
    const secondEdit = mockFile('second-edit.mp4')
    gen.setVideo(originalVideo)
    edit.setAnimationInstruction(gen.id, '改成跑步')
    edit.editHistory.record(gen)
    gen.setVideo(firstEdit)
    edit.editHistory.record(gen)
    gen.setVideo(secondEdit)
    edit.setSelectedItem({ type: 'animation', id: gen.id })
    await wrapper.vm.$nextTick()
    for (let i = 0; i < undoSteps; i++) {
      await wrapper.get('button[aria-label="Undo edit"]').trigger('click')
    }

    const current = edit.getAnimationById(gen.id)
    expect(current?.video).toBe([secondEdit, firstEdit, originalVideo][undoSteps])
    expect(current?.framesConfig).toBeNull()
    expect(current?.result).toBeUndefined()
    const discard = wrapper.get('button[aria-label="Discard changes"]')
    expect(discard.attributes('disabled')).toBeUndefined()
    openModal.mockRejectedValueOnce(new Cancelled())
    await discard.trigger('click')
    await flushPromises()
    expect(edit.getAnimationById(gen.id)).toBe(current)
    expect(edit.editHistory.canUndo(gen.id)).toBe(undoSteps < 2)
    expect(edit.editHistory.canRedo(gen.id)).toBe(undoSteps > 0)
    expect(edit.getAnimationInstruction(gen.id)).toBe('改成跑步')

    await discard.trigger('click')
    await flushPromises()
    expect(openModal).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: '放弃修改？', confirmText: '放弃修改', cancelText: '取消' })
    )
    expect(edit.editHistory.canUndo(gen.id)).toBe(false)
    expect(edit.editHistory.canRedo(gen.id)).toBe(false)
    expect(edit.getAnimationInstruction(gen.id)).toBe('')
    expect(edit.getAnimationById(gen.id)?.video).toBe(originalVideo)
    expect(edit.getAnimationById(gen.id)?.result).toBeUndefined()
    expect(edit.editHistory.canUndo(costume.id)).toBe(true)
    expect(apply).not.toHaveBeenCalled()
    expect(source.animations).toEqual([originalAnimation])
    expect(wrapper.find('button[aria-label="Discard changes"]').exists()).toBe(false)
  })

  it('edits saved costumes with a separate instruction and retains the current image', async () => {
    const { wrapper, edit, source } = setup(mode)
    const gen = edit.costumes[0]
    const originalImage = gen.image
    const editCostume = vi.spyOn(edit, 'editCostume').mockResolvedValue()
    const generate = vi.spyOn(gen, 'generate').mockResolvedValue()
    expect(wrapper.findComponent(CostumeEditInput).exists()).toBe(true)
    expect(wrapper.findComponent(ReferenceImageInput).exists()).toBe(false)
    const input = wrapper.get('textarea')
    expect(input.attributes('placeholder')).toBe('描述对当前造型的修改')
    await input.trigger('focus')
    expect(edit.getCostumeInstruction(gen.id)).toBe('')
    expect(wrapper.get('button[aria-label="Edit costume"]').attributes('disabled')).toBeDefined()

    await input.setValue('把衣服改成蓝色，保留姿势')
    expect(wrapper.find('button[aria-label="Enrich details"]').exists()).toBe(false)
    const submit = wrapper.get('button[aria-label="Edit costume"]')
    expect(submit.text()).toBe('修改造型')
    await submit.trigger('click')
    await flushPromises()

    expect(editCostume).toHaveBeenCalledWith(gen.id, '把衣服改成蓝色，保留姿势')
    expect(generate).not.toHaveBeenCalled()
    expect(gen.settings.description).toBe('')
    expect(edit.getCostumeInstruction(gen.id)).toBe('把衣服改成蓝色，保留姿势')
    expect(gen.image).toBe(originalImage)
    expect(source.costumes[0].img).toBe(originalImage)
    vi.spyOn(gen, 'editInstruction', 'get').mockReturnValue('把衣服改成蓝色，保留姿势')
    edit.setSelectedItem({ type: 'animation', id: edit.animations[0].id })
    await wrapper.vm.$nextTick()
    edit.setSelectedItem({ type: 'costume', id: gen.id })
    await wrapper.vm.$nextTick()
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('把衣服改成蓝色，保留姿势')
    expect(wrapper.get('button[aria-label="Edit costume"]').text()).toBe('修改造型')
    await wrapper.get('textarea').setValue('把衣服改成红色')
    expect(wrapper.get('button[aria-label="Edit costume"]').text()).toBe('修改造型')
    expect(wrapper.get('textarea').attributes('disabled')).toBeUndefined()
  })

  it('keeps newly added costumes on the normal generation input', async () => {
    const { wrapper, edit } = setup(mode)
    const gen = edit.addCostume()
    edit.setSelectedItem({ type: 'costume', id: gen.id })
    const generate = vi.spyOn(gen, 'generate').mockResolvedValue()
    const editCostume = vi.spyOn(gen, 'edit').mockResolvedValue()
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(CostumeSettingsInput).exists()).toBe(true)
    expect(wrapper.findComponent(CostumeEditInput).exists()).toBe(false)
    await wrapper.get('textarea').setValue('一只戴帽子的猫')
    await wrapper.get('button[aria-label="Submit"]').trigger('click')
    expect(generate).toHaveBeenCalledTimes(1)
    expect(editCostume).not.toHaveBeenCalled()
  })

  it('edits saved animations with a separate instruction and restores the input after editing', async () => {
    const { wrapper, edit, source } = setup(mode)
    const gen = edit.animations[0]
    const original = gen.result
    const state = shallowRef<AnimationGen['generateVideoState']>({ status: 'initial' })
    vi.spyOn(gen, 'generateVideoState', 'get').mockImplementation(() => state.value)
    const editVideo = vi.spyOn(edit, 'editAnimation').mockResolvedValue()
    const generateVideo = vi.spyOn(gen, 'generateVideo').mockResolvedValue()
    edit.setSelectedItem({ type: 'animation', id: gen.id })
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(AnimationEditInput).exists()).toBe(true)
    expect(wrapper.findComponent(ReferenceImageInput).exists()).toBe(false)
    const input = wrapper.get('textarea')
    await input.trigger('focus')
    expect(edit.getAnimationInstruction(gen.id)).toBe('')
    const submit = wrapper.get('button[aria-label="Edit animation"]')
    expect(input.attributes('placeholder')).toBe('描述对当前动画的修改')
    expect(submit.text()).toBe('修改动画')
    expect(submit.attributes('disabled')).toBeDefined()

    await input.setValue('把步伐改得更轻快，保留角色外观')
    await submit.trigger('click')
    await flushPromises()
    expect(editVideo).toHaveBeenCalledWith(gen.id, '把步伐改得更轻快，保留角色外观')
    expect(generateVideo).not.toHaveBeenCalled()
    expect(gen.settings.description).toBe('')
    state.value = { status: 'running', timeLeft: null }
    await wrapper.vm.$nextTick()
    expect(input.attributes('disabled')).toBeDefined()
    expect(submit.attributes('disabled')).toBeDefined()

    state.value = { status: 'finished', result: mockFile('edited.mp4') }
    await wrapper.vm.$nextTick()
    expect(input.attributes('disabled')).toBeUndefined()
    expect(submit.attributes('disabled')).toBeUndefined()
    expect(edit.getAnimationInstruction(gen.id)).toBe('把步伐改得更轻快，保留角色外观')
    expect(gen.result).toBe(original)
    expect(source.animations[0].costumes[0].img).toBe(original?.costumes[0].img)
    vi.spyOn(gen, 'editInstruction', 'get').mockReturnValue('把步伐改得更轻快，保留角色外观')
    await input.setValue('把步伐改慢一点')
    expect(edit.getAnimationInstruction(gen.id)).toBe('把步伐改慢一点')
    expect(submit.text()).toBe('修改动画')
  })

  it('allows editing a newly generated video before saving it or configuring extraction', async () => {
    const { wrapper, edit } = setup(mode)
    const gen = edit.addAnimation()
    edit.setSelectedItem({ type: 'animation', id: gen.id })
    const generateVideo = vi.spyOn(gen, 'generateVideo').mockResolvedValue()
    const editVideo = vi.spyOn(gen, 'editVideo').mockResolvedValue()
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(AnimationSettingsInput).exists()).toBe(true)
    expect(wrapper.findComponent(AnimationEditInput).exists()).toBe(false)
    await wrapper.get('textarea').setValue('向前奔跑')
    await wrapper.get('button[aria-label="Submit"]').trigger('click')
    expect(generateVideo).toHaveBeenCalledTimes(1)
    expect(editVideo).not.toHaveBeenCalled()

    gen.setVideo(mockFile('new-animation.mp4'))
    await wrapper.vm.$nextTick()
    expect(gen.result).toBeUndefined()
    expect(gen.framesConfig).toBeNull()
    expect(wrapper.findComponent(AnimationSettingsInput).exists()).toBe(false)
    expect(wrapper.findComponent(AnimationEditInput).exists()).toBe(true)
    await wrapper.get('textarea').setValue('把帽子改成蓝色')
    const submit = wrapper.get('button[aria-label="Edit animation"]')
    expect(submit.attributes('disabled')).toBeUndefined()
    await submit.trigger('click')
    await flushPromises()
    expect(editVideo).toHaveBeenCalledWith('把帽子改成蓝色')
  })

  it('keeps instructions after an edit error and when minimizing', async () => {
    const { wrapper, parent, edit } = setup(mode)
    const gen = edit.costumes[0]
    vi.spyOn(edit, 'editCostume').mockRejectedValueOnce(new Error('Service unavailable'))
    await wrapper.get('textarea').setValue('保留轮廓，改成红色')
    await wrapper.get('button[aria-label="Edit costume"]').trigger('click')
    await flushPromises()
    expect(messageError).toHaveBeenCalledWith(expect.stringContaining('修改造型失败'))
    expect(edit.getCostumeInstruction(gen.id)).toBe('保留轮廓，改成红色')

    await wrapper.get('button[aria-label="Minimize"]').trigger('click')
    expect(parent.emitted(mode === 'edit' ? 'cancelled' : 'collapse')).toEqual([[]])
  })
})

describe('Existing sprite draft', () => {
  it('adopts only the selected resource and keeps the modal open', async () => {
    const { wrapper, parent, edit, source, apply } = setup('edit')
    const costume = edit.costumes[0]
    const originalAnimation = source.animations[0]
    edit.editHistory.record(costume)
    costume.setName('newName')
    await wrapper.vm.$nextTick()
    const submit = wrapper.get('button[aria-label="Apply resource"]')
    expect(submit.text()).toBe('采用造型')
    expect(wrapper.find('button[aria-label="Use"]').exists()).toBe(false)
    await submit.trigger('click')
    await flushPromises()

    expect(apply).toHaveBeenCalledWith({ type: 'costume', id: costume.id })
    expect(source.costumes[0].name).toBe('newName')
    expect(source.animations[0]).toBe(originalAnimation)
    expect(edit.editHistory.canUndo(costume.id)).toBe(false)
    expect(parent.emitted('resolved')).toBeUndefined()
  })

  it('retains history when adoption fails', async () => {
    const { wrapper, edit, source, apply } = setup('edit')
    const costume = edit.costumes[0]
    edit.editHistory.record(costume)
    costume.setName('newName')
    apply.mockRejectedValueOnce(new Error('Failed to save'))
    await wrapper.vm.$nextTick()
    await wrapper.get('button[aria-label="Apply resource"]').trigger('click')
    await flushPromises()
    expect(edit.editHistory.canUndo(costume.id)).toBe(true)
    expect(source.costumes[0].name).toBe('idle')
    expect(messageError).toHaveBeenCalledWith(expect.stringContaining('采用修改失败'))
  })
})
