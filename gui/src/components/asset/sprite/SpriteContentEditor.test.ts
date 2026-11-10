import { flushPromises, shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { Cancelled, DefaultException } from '@/utils/exception'
import { createI18n } from '@/utils/i18n'
import { mockFile } from '@/models/common/test'
import { Animation } from '@/models/spx/animation'
import { Costume } from '@/models/spx/costume'
import { AnimationGen } from '@/models/spx/gen/animation-gen'
import { CostumeGen } from '@/models/spx/gen/costume-gen'
import { SpriteGen, type SpriteGenResult } from '@/models/spx/gen/sprite-gen'
import { Phase } from '@/models/spx/gen/common'
import { SpriteEdit } from '@/models/spx/edit/sprite-edit'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import AnimationDetail from '@/components/editor/sprite/AnimationDetail.vue'
import CostumeDetail from '@/components/editor/sprite/CostumeDetail.vue'
import ResourceWorkspace from '@/components/editor/sprite/ResourceWorkspace.vue'
import CostumeGenItem from '../gen/costume/CostumeGenItem.vue'
import AnimationGenItem from '../gen/animation/AnimationGenItem.vue'
import CostumeSettingsInput from '../gen/costume/CostumeSettingsInput.vue'
import AnimationSettingsInput from '../gen/animation/AnimationSettingsInput.vue'
import ReferenceImageInput from '../gen/common/ReferenceImageInput.vue'
import CostumeEditInput from './CostumeEditInput.vue'
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
vi.mock('@/utils/user', () => ({ useEnsureSignedIn: () => async () => {} }))

type Mode = 'generate' | 'edit'

function setup<T extends Mode>(mode: T, embedded = false) {
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
        embedded
          ? h(
              SpriteContentEditor,
              {
                content: edit,
                embedded: true,
                applyResource: apply,
                savedAnimation: animation,
                savedCostume: source.costumes[0]
              },
              {
                settings: () => h('div', { 'data-resource-settings': '' })
              }
            )
          : edit instanceof SpriteEdit
            ? h(SpriteEditModal, { visible: true, edit, apply })
            : h(SpriteGenPhaseContent, { gen: edit })
    ),
    {
      attachTo: document.body,
      global: {
        plugins: [i18n],
        renderStubDefaultSlot: true,
        stubs: {
          ResourceWorkspace: embedded ? false : true,
          ResourceTool: false,
          ResourceEditActions: false,
          SpriteEditModal: false,
          SpriteGenPhaseContent: false,
          SpriteContentEditor: false,
          SpriteResourceInput: false,
          CostumeEditInput: false,
          CostumeSettingsInput: false,
          AnimationSettingsInput: false,
          CostumeGenPreview: defineComponent(
            (_, { slots }) =>
              () =>
                h('div', { 'data-resource-preview': 'costume' }, [slots.leading?.(), slots.ops?.()])
          ),
          AnimationGenPreview: defineComponent(
            (_, { slots }) =>
              () =>
                h('div', { 'data-resource-preview': 'animation' }, [slots.leading?.(), slots.ops?.()])
          ),
          SettingsInput: false,
          UIButton: false,
          UIButtonGroup: false,
          UIButtonGroupItem: false,
          UITooltip: defineComponent(
            (_, { slots }) =>
              () =>
                h('div', slots.trigger?.())
          ),
          UIDropdown: defineComponent(
            (_, { slots }) =>
              () =>
                h('div', [slots.trigger?.(), slots.default?.()])
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
  const wrapper =
    mode === 'generate' ? host.getComponent(SpriteGenPhaseContent) : host.getComponent(SpriteContentEditor)
  const parent = embedded
    ? wrapper
    : edit instanceof SpriteEdit
      ? host.getComponent(SpriteEditModal)
      : host.getComponent(SpriteGenPhaseContent)
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

describe('Legacy sprite generation adoption', () => {
  it('keeps the original generation settings without the new editing workspace', async () => {
    const { wrapper, edit } = setup('generate')
    expect(wrapper.findComponent(SpriteContentEditor).exists()).toBe(false)
    expect(wrapper.findComponent(ResourceWorkspace).exists()).toBe(false)
    expect(wrapper.findComponent(CostumeEditInput).exists()).toBe(false)
    expect(wrapper.get('textarea').attributes('readonly')).toBeDefined()

    const costume = edit.addCostume()
    edit.setSelectedItem({ type: 'costume', id: costume.id })
    const generate = vi.spyOn(costume, 'generate').mockResolvedValue()
    await wrapper.vm.$nextTick()
    await wrapper.get('textarea').setValue('A blue cat')
    await wrapper.get('button[aria-label="Submit"]').trigger('click')
    await flushPromises()
    expect(costume.settings.description).toBe('A blue cat')
    expect(generate).toHaveBeenCalledOnce()
    expect(wrapper.find('button[aria-label="Local edit tool"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Save resource"]').exists()).toBe(false)
  })

  it('adopts saved content using the existing result contract', async () => {
    const { wrapper, parent, edit } = setup('generate')
    const finish = vi.spyOn(edit, 'finish')
    await wrapper.get('button[aria-label="Use"]').trigger('click')
    await flushPromises()

    expect(openModal).not.toHaveBeenCalled()
    expect(finish).toHaveBeenCalledOnce()
    const { sprite, contentSettings } = parent.emitted<[SpriteGenResult]>('resolved')![0][0]
    onTestFinished(() => sprite.dispose())
    expect(sprite.costumes).toHaveLength(1)
    expect(sprite.animations).toHaveLength(1)
    expect(contentSettings).toBeNull()
    expect(edit.recordAdoption).toHaveBeenCalledOnce()
  })

  it('preserves unfinished generations when adoption is cancelled and adopts saved results after confirmation', async () => {
    const { wrapper, parent, edit } = setup('generate')
    const animation = edit.addAnimation()
    const video = mockFile('pending.mp4')
    animation.setVideo(video)
    vi.spyOn(animation, 'generateVideoState', 'get').mockReturnValue({ status: 'finished', result: video })
    edit.setSelectedItem({ type: 'animation', id: animation.id })
    await wrapper.vm.$nextTick()
    await wrapper.get('textarea').setValue('Run to the right')
    const finish = vi.spyOn(edit, 'finish')
    openModal.mockRejectedValueOnce(new Cancelled())
    await wrapper.get('button[aria-label="Use"]').trigger('click')
    await flushPromises()

    expect(openModal).toHaveBeenCalledWith(expect.objectContaining({ confirmText: '仍要采用' }))
    expect(finish).not.toHaveBeenCalled()
    expect(parent.emitted('resolved')).toBeUndefined()
    expect(animation.video).toBe(video)
    expect(animation.settings.description).toBe('Run to the right')
    expect(messageError).not.toHaveBeenCalled()

    await wrapper.get('button[aria-label="Use"]').trigger('click')
    await flushPromises()
    const { sprite } = parent.emitted<[SpriteGenResult]>('resolved')![0][0]
    onTestFinished(() => sprite.dispose())
    expect(sprite.animations).toHaveLength(1)
    expect(sprite.animations[0].name).toBe('walk')
  })

  it.each(['running', 'failed'] as const)('asks for confirmation when generation is %s', async (status) => {
    const { wrapper, edit } = setup('generate')
    const costume = edit.addCostume()
    vi.spyOn(costume, 'generateState', 'get').mockReturnValue(
      status === 'running'
        ? { status, timeLeft: null }
        : { status, error: new DefaultException({ en: 'Unavailable', zh: '服务不可用' }) }
    )
    const finish = vi.spyOn(edit, 'finish')
    openModal.mockRejectedValueOnce(new Cancelled())
    await wrapper.vm.$nextTick()
    await wrapper.get('button[aria-label="Use"]').trigger('click')
    await flushPromises()

    expect(openModal).toHaveBeenCalledOnce()
    expect(finish).not.toHaveBeenCalled()
  })
})

describe('Existing sprite resource actions', () => {
  it.each(['costume', 'animation'] as const)('applies only changed %s content', async (type) => {
    const { wrapper, edit, apply } = setup('edit')
    const gen = type === 'costume' ? edit.costumes[0] : edit.animations[0]
    edit.setSelectedItem({ type, id: gen.id })
    await wrapper.vm.$nextTick()
    const button = wrapper.get('button[aria-label="Save resource"]')
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

describe('Sprite content editing', () => {
  it('reactivates local editing when returning to a draft with comments', async () => {
    const { wrapper, edit } = setup('edit')
    const gen = edit.costumes[0]
    edit.editHistory.record(gen)
    gen.setImage(mockFile('first.png'))
    gen.setEditComments([{ id: 'point', x: 0.5, y: 0.5, content: 'Make this blue' }])
    edit.editHistory.record(gen)
    gen.setImage(mockFile('second.png'))
    await wrapper.vm.$nextTick()

    await wrapper.get('button[aria-label="Undo edit"]').trigger('click')
    expect(wrapper.get('button[aria-label="Local edit tool"]').attributes('aria-pressed')).toBe('true')
    await wrapper.get('button[aria-label="Undo edit"]').trigger('click')
    expect(wrapper.get('button[aria-label="Local edit tool"]').attributes('aria-pressed')).toBe('false')
    await wrapper.get('button[aria-label="Redo edit"]').trigger('click')
    expect(wrapper.get('button[aria-label="Local edit tool"]').attributes('aria-pressed')).toBe('true')

    edit.setSelectedItem({ type: 'animation', id: edit.animations[0].id })
    await wrapper.vm.$nextTick()
    edit.setSelectedItem({ type: 'costume', id: gen.id })
    await wrapper.vm.$nextTick()
    expect(wrapper.get('button[aria-label="Local edit tool"]').attributes('aria-pressed')).toBe('true')
    await wrapper.get('button[aria-label="Remove local edit 1"]').trigger('click')
    expect(wrapper.get('button[aria-label="Local edit tool"]').attributes('aria-pressed')).toBe('false')
  })

  it('undoes and redoes only the selected resource before adoption', async () => {
    const { wrapper, edit, source } = setup('edit')
    const gen = edit.costumes[0]
    edit.editHistory.record(gen)
    gen.setName('newName')
    await wrapper.vm.$nextTick()
    await wrapper.get('button[aria-label="Undo edit"]').trigger('click')
    expect(edit.costumes[0].name).toBe('idle')
    expect(source.costumes[0].name).toBe('idle')
    expect(wrapper.find('button[aria-label="Save resource"]').exists()).toBe(true)
    expect(wrapper.get('button[aria-label="Discard changes"]').text()).toBe('放弃')
    await wrapper.get('button[aria-label="Redo edit"]').trigger('click')
    expect(edit.costumes[0].name).toBe('newName')
    expect(source.costumes[0].name).toBe('idle')
    expect(wrapper.find('button[aria-label="Discard changes"]').exists()).toBe(true)
    await wrapper.get('button[aria-label="Save resource"]').trigger('click')
    await flushPromises()
    expect(edit.editHistory.canUndo(gen.id)).toBe(false)
    expect(edit.editHistory.canRedo(gen.id)).toBe(false)
  })

  it.each([0, 1, 2])('discards only the current animation generations after %i undo steps', async (undoSteps) => {
    const { wrapper, edit, source, apply } = setup('edit')
    const originalAnimation = source.animations[0]
    const costume = edit.costumes[0]
    edit.editHistory.record(costume)
    costume.setName('edited-costume')
    const gen = edit.addAnimation()
    const originalVideo = mockFile('original.mp4')
    const firstEdit = mockFile('first-edit.mp4')
    const secondEdit = mockFile('second-edit.mp4')
    gen.setVideo(originalVideo)
    gen.setSettings({ description: '改成跑步' })
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
    expect(edit.getAnimationById(gen.id)?.settings.description).toBe('改成跑步')

    await discard.trigger('click')
    await flushPromises()
    expect(openModal).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: '放弃修改？', confirmText: '放弃修改', cancelText: '取消' })
    )
    expect(edit.editHistory.canUndo(gen.id)).toBe(false)
    expect(edit.editHistory.canRedo(gen.id)).toBe(false)
    expect(edit.getAnimationById(gen.id)?.settings.description).toBe('改成跑步')
    expect(edit.getAnimationById(gen.id)?.video).toBe(originalVideo)
    expect(edit.getAnimationById(gen.id)?.result).toBeUndefined()
    expect(edit.editHistory.canUndo(costume.id)).toBe(true)
    expect(apply).not.toHaveBeenCalled()
    expect(source.animations).toEqual([originalAnimation])
    expect(wrapper.find('button[aria-label="Discard changes"]').exists()).toBe(false)
  })

  it('edits saved costumes with a separate instruction and retains the current image', async () => {
    const { wrapper, edit, source } = setup('edit')
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
    const { wrapper, edit } = setup('edit')
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

  it('keeps a generated animation on generation settings instead of video editing', async () => {
    const { wrapper, edit } = setup('edit', true)
    const gen = edit.addAnimation()
    edit.setSelectedItem({ type: 'animation', id: gen.id })
    const generateVideo = vi.spyOn(gen, 'generateVideo').mockResolvedValue()
    await flushPromises()
    expect(wrapper.findComponent(AnimationSettingsInput).exists()).toBe(true)
    await wrapper.get('textarea').setValue('向前奔跑')
    await wrapper.get('button[aria-label="Submit"]').trigger('click')
    await flushPromises()
    expect(generateVideo).toHaveBeenCalledTimes(1)

    gen.setVideo(mockFile('new-animation.mp4'))
    await flushPromises()
    expect(wrapper.findComponent(AnimationSettingsInput).exists()).toBe(true)
    expect(wrapper.findComponent(AnimationSettingsInput).exists()).toBe(true)
    expect(wrapper.find('[aria-label="Edit animation"]').exists()).toBe(false)
    await wrapper.get('textarea').setValue('向前跳跃')
    await wrapper.get('button[aria-label="Submit"]').trigger('click')
    await flushPromises()
    expect(generateVideo).toHaveBeenCalledTimes(2)
    expect(gen.settings.description).toBe('向前跳跃')
  })

  it('does not offer AI editing or generation for an adopted animation', async () => {
    const { wrapper, edit, source } = setup('edit', true)
    edit.setSelectedItem({ type: 'animation', id: edit.animations[0].id })
    await flushPromises()
    expect(wrapper.find('[aria-label="Resource tool panel ai"]').exists()).toBe(false)
    expect(wrapper.findComponent(AnimationSettingsInput).exists()).toBe(false)
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.get('[aria-label="Resource edit actions"]').isVisible()).toBe(false)
    expect(wrapper.getComponent(AnimationDetail).props('animation')).toBe(source.animations[0])
    expect(wrapper.find('[data-resource-settings]').exists()).toBe(true)
  })

  it('keeps instructions after an edit error and when minimizing', async () => {
    const { wrapper, parent, edit } = setup('edit')
    const gen = edit.costumes[0]
    vi.spyOn(edit, 'editCostume').mockRejectedValueOnce(new Error('Service unavailable'))
    await wrapper.get('textarea').setValue('保留轮廓，改成红色')
    await wrapper.get('button[aria-label="Edit costume"]').trigger('click')
    await flushPromises()
    expect(messageError).toHaveBeenCalledWith(expect.stringContaining('修改造型失败'))
    expect(edit.getCostumeInstruction(gen.id)).toBe('保留轮廓，改成红色')

    await wrapper.get('button[aria-label="Minimize"]').trigger('click')
    expect(parent.emitted('cancelled')).toEqual([[]])
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
    const submit = wrapper.get('button[aria-label="Save resource"]')
    expect(submit.text()).toBe('保存')
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
    await wrapper.get('button[aria-label="Save resource"]').trigger('click')
    await flushPromises()
    expect(edit.editHistory.canUndo(costume.id)).toBe(true)
    expect(source.costumes[0].name).toBe('idle')
    expect(messageError).toHaveBeenCalledWith(expect.stringContaining('采用修改失败'))
  })
})

describe('Embedded AI workspace', () => {
  it.each(['costume', 'animation'] as const)(
    'does not offer AI review for %s metadata changes without edit history',
    async (type) => {
      const { wrapper, edit } = setup('edit', true)
      const gen = type === 'costume' ? edit.costumes[0] : edit.animations[0]
      const item = { type, id: gen.id }
      edit.setSelectedItem(item)
      gen.setName('renamed')
      await flushPromises()

      expect(edit.hasResourceChanges(item)).toBe(true)
      expect(edit.editHistory.canUndo(gen.id)).toBe(false)
      expect(edit.editHistory.canRedo(gen.id)).toBe(false)
      expect(wrapper.get('[aria-label="Resource edit actions"]').isVisible()).toBe(false)
      expect(wrapper.get('button[aria-label="Save resource"]').attributes('disabled')).toBeDefined()
    }
  )

  it.each(['costume'] as const)('shows the adopted %s outside the AI tab without losing its draft', async (type) => {
    const { wrapper, edit, source, apply } = setup('edit', true)
    const gen = type === 'costume' ? edit.costumes[0] : edit.animations[0]
    edit.setSelectedItem({ type, id: gen.id })
    edit.editHistory.record(gen)
    const draft = mockFile(type === 'costume' ? 'edited.png' : 'edited.mp4')
    if (gen instanceof CostumeGen) {
      gen.setImage(draft)
      gen.setEditComments([{ id: 'point', x: 0.5, y: 0.5, content: 'Blue' }])
      edit.setCostumeInstruction(gen.id, 'Make it blue')
    } else {
      gen.setVideo(draft)
      gen.setFramesConfig({ startTime: 1, duration: 2, interval: 0.1 })
      gen.setSettings({ description: 'Make it blue' })
    }
    await flushPromises()
    const workspace = wrapper.getComponent(ResourceWorkspace)
    expect(wrapper.get('[data-resource-preview]').attributes('data-resource-preview')).toBe(type)

    for (const tool of ['duration', 'binding', 'sound', null]) {
      workspace.vm.$emit('update:activeTool', tool)
      await flushPromises()
      expect(wrapper.find('[data-resource-preview]').exists()).toBe(false)
      expect(wrapper.get('[aria-label="Resource edit actions"]').isVisible()).toBe(false)
      if (type === 'costume') {
        expect(wrapper.getComponent(CostumeDetail).props('costume')).toBe(source.costumes[0])
      } else {
        expect(wrapper.getComponent(AnimationDetail).props('animation')).toBe(source.animations[0])
      }
      workspace.vm.$emit('update:activeTool', 'ai')
      await flushPromises()
      expect(wrapper.get('[data-resource-preview]').attributes('data-resource-preview')).toBe(type)
      expect(wrapper.get('[aria-label="Resource edit actions"]').isVisible()).toBe(true)
      expect(wrapper.get('textarea').element.value).toBe('Make it blue')
    }
    expect(edit.editHistory.canUndo(gen.id)).toBe(true)
    if (gen instanceof CostumeGen) {
      expect(gen.image).toBe(draft)
      expect(gen.editComments).toHaveLength(1)
    } else {
      expect(gen.video).toBe(draft)
      expect(gen.framesConfig).toEqual({ startTime: 1, duration: 2, interval: 0.1 })
    }
    expect(apply).not.toHaveBeenCalled()
  })

  it.each(['costume'] as const)('shows %s actions only for an unsaved result or redo history', async (type) => {
    const { wrapper, edit } = setup('edit', true)
    const gen = type === 'costume' ? edit.costumes[0] : edit.animations[0]
    edit.setSelectedItem({ type, id: gen.id })
    await flushPromises()
    wrapper.getComponent(SpriteContentEditor).vm.openAIEditor()
    await flushPromises()
    expect(wrapper.get('[aria-label="Resource tool panel ai"]').isVisible()).toBe(true)
    const actions = () => wrapper.get('[aria-label="Resource edit actions"]')
    expect(actions().isVisible()).toBe(false)

    await wrapper.get('textarea').setValue('Make it blue')
    expect(wrapper.getComponent(ResourceWorkspace).props('selectionLocked')).toBe(false)
    edit.editHistory.record(gen)
    await flushPromises()
    expect(actions().isVisible()).toBe(false)
    expect(wrapper.getComponent(ResourceWorkspace).props('selectionLocked')).toBe(true)

    if (gen instanceof CostumeGen) gen.setImage(mockFile('edited.png'))
    else gen.setVideo(mockFile('edited.mp4'))
    await flushPromises()
    expect(actions().isVisible()).toBe(true)
    await wrapper.get('button[aria-label="Undo edit"]').trigger('click')
    await flushPromises()
    expect(actions().isVisible()).toBe(true)
    expect(wrapper.get('button[aria-label="Redo edit"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.getComponent(ResourceWorkspace).props('selectionLocked')).toBe(true)
    edit.editHistory.clear(gen.id)
    await flushPromises()
    expect(actions().isVisible()).toBe(false)

    const pending = type === 'costume' ? edit.addCostume() : edit.addAnimation()
    edit.setSelectedItem({ type, id: pending.id })
    await flushPromises()
    expect(actions().isVisible()).toBe(false)
    expect(wrapper.getComponent(ResourceWorkspace).props('selectionLocked')).toBe(false)
    if (pending instanceof CostumeGen) pending.setImage(mockFile('generated.png'))
    else pending.setVideo(mockFile('generated.mp4'))
    await flushPromises()
    expect(actions().isVisible()).toBe(true)
  })

  it.each(['costume'] as const)('opens AI editing when returning to a %s draft', async (type) => {
    const { wrapper, edit } = setup('edit', true)
    const gen = type === 'costume' ? edit.costumes[0] : edit.animations[0]
    const other = type === 'costume' ? edit.animations[0] : edit.costumes[0]
    edit.editHistory.record(gen)
    if (gen instanceof CostumeGen) {
      vi.spyOn(gen, 'editInstruction', 'get').mockReturnValue('Make it blue')
      gen.setImage(mockFile('edited.png'))
      edit.setCostumeInstruction(gen.id, 'Make it blue')
    } else {
      gen.setVideo(mockFile('edited.mp4'))
      gen.setSettings({ description: 'Make it blue' })
    }
    edit.setSelectedItem({ type, id: gen.id })
    await flushPromises()
    const aiPanel = () => wrapper.get('[aria-label="Resource tool panel ai"]')
    expect(aiPanel().isVisible()).toBe(true)
    expect(wrapper.find('[aria-label="Close resource workspace"]').exists()).toBe(false)

    edit.setSelectedItem({ type: type === 'costume' ? 'animation' : 'costume', id: other.id })
    await flushPromises()
    expect(wrapper.find('[aria-label="Resource tool panel ai"]').exists()).toBe(false)
    expect(wrapper.findComponent(AnimationDetail).exists()).toBe(true)

    edit.setSelectedItem({ type, id: gen.id })
    await flushPromises()
    expect(aiPanel().isVisible()).toBe(true)
    expect(wrapper.get('[data-resource-preview]').attributes('data-resource-preview')).toBe(type)
    expect(wrapper.get('textarea').element.value).toBe('Make it blue')
  })

  it('keeps result review open until the edit is kept or discarded', async () => {
    const { wrapper, edit, source } = setup('edit', true)
    const gen = edit.costumes[0]
    edit.editHistory.record(gen)
    gen.setName('draft')
    gen.setEditComments([{ id: 'point', x: 0.5, y: 0.5, content: 'Blue' }])
    edit.setCostumeInstruction(gen.id, 'Keep the pose')
    await flushPromises()
    expect(wrapper.get('button[aria-label="Save resource"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[aria-label="Resource tool panel ai"]').isVisible()).toBe(true)
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
    expect(source.costumes[0].name).toBe('idle')
    expect(wrapper.get('textarea').element.value).toBe('Keep the pose')
    expect(gen.editComments).toHaveLength(1)
    expect(edit.editHistory.canUndo(gen.id)).toBe(true)
    expect(wrapper.find('[aria-label="Close resource workspace"]').exists()).toBe(false)
    const preview = wrapper.get('[data-resource-preview]').element
    await wrapper.get('button[aria-label="Undo edit"]').trigger('click')
    expect(edit.costumes[0].name).toBe('idle')
    await wrapper.get('button[aria-label="Redo edit"]').trigger('click')
    expect(edit.costumes[0].name).toBe('draft')
    expect(wrapper.get('[data-resource-preview]').element).toBe(preview)
  })

  it('keeps local editing inside the prompt and exits after removing the last point', async () => {
    const { wrapper, edit } = setup('edit', true)
    const gen = edit.costumes[0]
    edit.setCostumeInstruction(gen.id, 'Keep the pose')
    await flushPromises()
    expect(wrapper.find('button[aria-label="AI prompt tool"]').exists()).toBe(false)
    const input = () => wrapper.get('[aria-label="Costume edit instructions"]')
    const localEdit = () => input().get('button[aria-label="Local edit tool"]')
    await localEdit().trigger('click')
    await flushPromises()
    expect(localEdit().attributes('aria-pressed')).toBe('true')
    expect(input().get('textarea').isVisible()).toBe(true)
    expect(input().get('textarea').element.value).toBe('Keep the pose')
    gen.setEditComments([{ id: 'point', x: 0.5, y: 0.5, content: 'Make this blue' }])
    await flushPromises()
    expect(localEdit().text()).toBe('1 处修改')
    await localEdit().trigger('click')
    await flushPromises()
    expect(localEdit().attributes('aria-expanded')).toBe('true')
    expect(input().get('button[aria-label="Edit local instruction 1"]').text()).toBe('Make this blue')
    await input().get('button[aria-label="Remove local edit 1"]').trigger('click')
    await flushPromises()
    expect(gen.editComments).toHaveLength(0)
    expect(localEdit().attributes('aria-pressed')).toBe('false')
    expect(input().get('textarea').element.value).toBe('Keep the pose')
  })

  it('preserves a failed save, then exits AI editing only after the selected resource is applied', async () => {
    const { wrapper, edit, source, apply } = setup('edit', true)
    const gen = edit.costumes[0]
    edit.editHistory.record(gen)
    gen.setName('saved')
    const pendingCostume = edit.addCostume()
    edit.setSelectedItem({ type: 'costume', id: gen.id })
    edit.setCostumeInstruction(gen.id, 'Change the color')
    await flushPromises()
    apply.mockRejectedValueOnce(new DefaultException({ en: 'Save failed', zh: '保存失败' }))
    await wrapper.get('button[aria-label="Save resource"]').trigger('click')
    await flushPromises()
    await wrapper.getComponent(ResourceWorkspace).trigger('pointerdown')
    expect(wrapper.get('[aria-label="Resource tool panel ai"]').isVisible()).toBe(true)
    expect(edit.editHistory.canUndo(gen.id)).toBe(true)
    expect(source.costumes[0].name).toBe('idle')
    await wrapper.get('button[aria-label="Save resource"]').trigger('click')
    await flushPromises()
    expect(source.costumes[0].name).toBe('saved')
    expect(source.animations[0].name).toBe('walk')
    expect(edit.editHistory.canUndo(gen.id)).toBe(false)
    expect(edit.getCostumeInstruction(gen.id)).toBe('')
    expect(edit.getCostumeById(pendingCostume.id)).toBe(pendingCostume)
    expect(wrapper.get('[aria-label="Resource tool panel ai"]').isVisible()).toBe(false)
    expect(wrapper.get('[aria-label="Resource edit actions"]').isVisible()).toBe(false)
    expect(wrapper.getComponent(CostumeDetail).props('costume')).toBe(source.costumes[0])
    wrapper.getComponent(SpriteContentEditor).vm.openAIEditor()
    await flushPromises()
    expect(wrapper.get('[aria-label="Resource tool panel ai"]').isVisible()).toBe(true)
  })

  it('can undo, redo and discard an animation generation without creating a project resource', async () => {
    const { wrapper, edit, source } = setup('edit', true)
    const gen = edit.addAnimation()
    gen.setSettings({ description: 'Walk' })
    edit.setSelectedItem({ type: 'animation', id: gen.id })
    vi.spyOn(gen, 'generateVideo').mockImplementation(async () => {
      gen.setVideo(mockFile('new.mp4'))
    })
    await flushPromises()
    expect(wrapper.getComponent(ResourceWorkspace).props('selectionLocked')).toBe(false)
    await wrapper.get('button[aria-label="Submit"]').trigger('click')
    await flushPromises()
    expect(edit.editHistory.canUndo(gen.id)).toBe(true)
    expect(source.animations).toHaveLength(1)
    await wrapper.get('button[aria-label="Undo edit"]').trigger('click')
    await flushPromises()
    expect(edit.getAnimationById(gen.id)?.video).toBeNull()
    await wrapper.getComponent(ResourceWorkspace).trigger('pointerdown')
    expect(wrapper.get('[aria-label="Resource tool panel ai"]').isVisible()).toBe(true)
    expect(source.animations).toHaveLength(1)
    await wrapper.get('button[aria-label="Redo edit"]').trigger('click')
    await flushPromises()
    expect(edit.getAnimationById(gen.id)?.video?.name).toBe('new.mp4')
    await wrapper.get('button[aria-label="Discard changes"]').trigger('click')
    await flushPromises()
    expect(edit.getAnimationById(gen.id)?.video).toBeNull()
    expect(source.animations).toHaveLength(1)
    expect(edit.editHistory.canRedo(gen.id)).toBe(false)
    await wrapper.getComponent(ResourceWorkspace).trigger('pointerdown')
    expect(wrapper.get('[aria-label="Resource tool panel ai"]').isVisible()).toBe(true)
  })

  it('opens existing costume editing only when requested, without tabs or edit actions', async () => {
    const { wrapper, source } = setup('edit', true)
    await flushPromises()
    expect(wrapper.get('[aria-label="Resource tool panel ai"]').isVisible()).toBe(false)
    wrapper.getComponent(SpriteContentEditor).vm.openAIEditor()
    await flushPromises()
    expect(wrapper.get('[aria-label="Resource tool panel ai"]').isVisible()).toBe(true)
    expect(wrapper.get('[aria-label="Resource edit actions"]').isVisible()).toBe(false)
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Close resource workspace"]').exists()).toBe(true)
    expect(openModal).not.toHaveBeenCalled()
    expect(source.costumes[0].name).toBe('idle')
  })

  it('requires confirmation to discard and keeps the source unchanged', async () => {
    const { wrapper, edit, source } = setup('edit', true)
    const gen = edit.costumes[0]
    edit.editHistory.record(gen)
    gen.setName('draft')
    await flushPromises()
    openModal.mockRejectedValueOnce(new Cancelled())
    await wrapper.get('button[aria-label="Discard changes"]').trigger('click')
    await flushPromises()
    expect(edit.costumes[0].name).toBe('draft')
    await wrapper.getComponent(ResourceWorkspace).trigger('pointerdown')
    expect(wrapper.get('[aria-label="Resource tool panel ai"]').isVisible()).toBe(true)
    await wrapper.get('button[aria-label="Discard changes"]').trigger('click')
    await flushPromises()
    expect(edit.costumes[0].name).toBe('idle')
    expect(edit.editHistory.canUndo(gen.id)).toBe(false)
    expect(wrapper.get('[aria-label="Resource tool panel ai"]').isVisible()).toBe(false)
    expect(source.costumes[0].name).toBe('idle')
    await wrapper.getComponent(ResourceWorkspace).trigger('pointerdown')
    expect(wrapper.get('[aria-label="Resource tool panel ai"]').isVisible()).toBe(false)
  })
})
