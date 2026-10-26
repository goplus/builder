import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { Facing, type SpriteContentSettings } from '@/apis/aigc'
import { AnimationLoopMode, ArtStyle, Perspective } from '@/apis/common'
import { mountPages, setupPageTests, signIn } from '@/apps/xbuilder/pages/test'
import { fromText } from '@/models/common/file'
import { Sprite, State } from '@/models/spx/sprite'
import { Costume } from '@/models/spx/costume'
import { SpriteEdit } from '@/models/spx/edit/sprite-edit'
import { AnimationGen } from '@/models/spx/gen/animation-gen'
import { Phase } from '@/models/spx/gen/common'
import { createI18n } from '@/utils/i18n'
import { Animation } from '@/models/spx/animation'
import SpriteGenPhaseSettings from '@/components/asset/gen/sprite/SpriteGenPhaseSettings.vue'
import CostumeGenItem from '@/components/asset/gen/costume/CostumeGenItem.vue'
import AnimationGenItem from '@/components/asset/gen/animation/AnimationGenItem.vue'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'
import UIConfirmDialog from '@/components/ui/dialog/UIConfirmDialog.vue'

function image(color: string) {
  return fromText(
    `${color}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="${color}"/></svg>`,
    { type: 'image/svg+xml', meta: { imgSize: { width: 48, height: 48 } } }
  )
}

async function setupCanvas() {
  await signIn()
  const { wrapper } = await mountPages('/editor/alice/First%20flight')
  await vi.waitFor(() => expect(wrapper.find('[aria-label="Sprites panel"]').exists()).toBe(true), { timeout: 4000 })
  const { project, state } = wrapper.getComponent(EditorContextProvider).props()
  const sprite = new Sprite('Kitten')
  sprite.addCostume(new Costume('Idle', image('orange')))
  project.addSprite(sprite)
  state.selectSprite(sprite.id)
  state.spriteState!.select('costumes')
  await nextTick()
  return { wrapper, project, state, sprite }
}

describe('canvas resource workflows', () => {
  setupPageTests()

  it('generates the default costume in a modal, then continues in the editor', async () => {
    const { wrapper, project, state } = await setupCanvas()
    await wrapper.get('[aria-label="Sprites panel"] [aria-label="Add"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Generate sprite"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Generate sprite"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Sprite generation modal"]').exists()).toBe(true))
    expect(wrapper.find('[aria-label="Generate sprite canvas"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Sprite content editor"]').exists()).toBe(false)
    expect(project.sprites).toHaveLength(1)
    expect(state.genState.sprites).toHaveLength(0)
    const gen = wrapper.getComponent(SpriteGenPhaseSettings).props('gen')
    const file = image('blue')
    vi.spyOn(gen, 'imagesGenState', 'get').mockReturnValue({ status: 'finished', result: [file] })
    gen.setImageIndex(0)
    const result = new Sprite('BlueKitten')
    result.addCostume(new Costume('default', file))
    const contentSettings: SpriteContentSettings = {
      costumes: [
        {
          name: 'Cape',
          description: 'A blue cape',
          facing: Facing.Front,
          artStyle: ArtStyle.Unspecified,
          perspective: Perspective.Unspecified,
          referenceImageUrl: null
        }
      ],
      animations: [
        {
          name: 'walk',
          description: 'Walk forward',
          loopMode: AnimationLoopMode.Loopable,
          artStyle: ArtStyle.Unspecified,
          perspective: Perspective.Unspecified,
          referenceFrameUrl: null
        }
      ],
      animationBindings: { [State.Step]: 'walk' }
    }
    const finish = vi.spyOn(gen, 'finishDefaultCostume').mockImplementation(async () => {
      gen.result = result
      return { sprite: result, contentSettings }
    })
    vi.spyOn(result, 'autoFit').mockResolvedValue()
    await nextTick()
    expect(project.sprites).toHaveLength(1)
    expect(state.genState.export()).toEqual({})
    await wrapper.get('[aria-label="Use sprite"]').trigger('click')
    await vi.waitFor(() => expect(project.sprites).toHaveLength(2))
    expect(finish).toHaveBeenCalledOnce()
    await vi.waitFor(() => expect(state.selectedSprite).toBe(result))
    expect(state.spriteState!.selected.type).toBe('costumes')
    expect(result.costumes).toHaveLength(1)
    expect(result.animations).toHaveLength(0)
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Sprite generation modal"]').exists()).toBe(false))
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Sprite content editor"]').exists()).toBe(true))
    await wrapper
      .findAllComponents(CostumeGenItem)
      .find((item) => item.props('gen').name === 'Cape')!
      .trigger('click')
    expect(
      (wrapper.get('[aria-label="Costume generation settings"] textarea').element as HTMLTextAreaElement).value
    ).toBe('A blue cape')
    await wrapper.get('[aria-label="Animations tab"]').trigger('click')
    expect(wrapper.getComponent(AnimationGenItem).props('gen').name).toBe('walk')
    expect(
      (wrapper.get('[aria-label="Animation generation settings"] textarea').element as HTMLTextAreaElement).value
    ).toBe('Walk forward')
    expect(result.costumes).toHaveLength(1)
    expect(result.animations).toHaveLength(0)
  })

  it('closes unfinished generation without leaving a sprite or a generation draft', async () => {
    const { wrapper, project, state } = await setupCanvas()
    await wrapper.get('[aria-label="Sprites panel"] [aria-label="Add"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Generate sprite"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Generate sprite"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Sprite generation modal"]').exists()).toBe(true))
    const gen = wrapper.getComponent(SpriteGenPhaseSettings).props('gen')
    vi.spyOn(gen, 'imagesGenState', 'get').mockReturnValue({ status: 'running', timeLeft: null })
    const cancel = vi.spyOn(gen, 'cancel')
    await nextTick()
    expect(project.sprites).toHaveLength(1)
    expect(state.genState.sprites).toHaveLength(0)
    await wrapper.get('[aria-label="Sprite generation modal"] [aria-label="Close button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Confirm button"]').exists()).toBe(true))
    wrapper.getComponent(UIConfirmDialog).vm.$emit('resolved')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Sprite generation modal"]').exists()).toBe(false))
    await vi.waitFor(() => expect(gen.isDisposed).toBe(true))
    expect(cancel).toHaveBeenCalledOnce()
    expect(project.sprites).toHaveLength(1)
    expect(state.genState.export()).toEqual({})
  })

  it('keeps new costumes and animations in drafts until each resource is saved', async () => {
    const { wrapper, state, sprite } = await setupCanvas()
    const originalDefault = sprite.defaultCostume!.id
    await wrapper.get('[aria-label="Add costume"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Generate resource"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Generate resource"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Costume generation settings"]').exists()).toBe(true))
    let edit = state.spriteEditState.edits[0]
    const costumeGen = edit.getCostumeById(edit.selectedItem!.id)!
    const costume = new Costume('Cape', image('blue'))
    costumeGen.setImage(costume.img)
    costumeGen.setName('Cape')
    await costumeGen.finish()
    await nextTick()
    expect(sprite.costumes).toHaveLength(1)
    await wrapper.get('[aria-label="Save resource"]').trigger('click')
    await vi.waitFor(() => expect(sprite.costumes).toHaveLength(2))
    expect(sprite.defaultCostume!.id).toBe(originalDefault)
    await vi.waitFor(() => expect(state.selectedCostume!.id).toBe(costumeGen.result!.id))

    await wrapper.get('[aria-label="Animations tab"]').trigger('click')
    await wrapper.get('[aria-label="Generate animation"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Animation generation settings"]').exists()).toBe(true))
    edit = state.spriteEditState.edits[0]
    const animationGen = edit.getAnimationById(edit.selectedItem!.id)!
    const animation = Animation.create('Walk', [new Costume('frame', image('green'))])
    const ready = new AnimationGen(createI18n({ lang: 'en' }), edit, state.project, {
      id: animationGen.id,
      settings: { name: 'Walk' },
      finishPhase: new Phase({ en: 'save animation', zh: '保存动画' }, { status: 'finished', result: animation })
    })
    edit.animations.splice(edit.animations.indexOf(animationGen), 1, ready)
    animationGen.dispose()
    await nextTick()
    expect(sprite.animations).toHaveLength(0)
    await wrapper.get('[aria-label="Save resource"]').trigger('click')
    await vi.waitFor(() => expect(sprite.animations).toHaveLength(1))
    await vi.waitFor(() => expect(state.selectedAnimation!.id).toBe(animation.id))
    expect(edit.hasPendingChanges).toBe(false)
    await wrapper.get('[aria-label="Add animation"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Generate resource"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Generate resource"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Animation generation settings"]').exists()).toBe(true))
    await wrapper.get('[aria-label="List of animation"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Remove"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Remove"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Animation edit instructions"]').exists()).toBe(true))
    expect(sprite.animations).toHaveLength(1)
  })

  it('opens an existing costume in place and applies only the chosen draft', async () => {
    const { wrapper, state, sprite } = await setupCanvas()
    const original = sprite.costumes[0]
    const instruction = 'Make the costume blue'
    await wrapper.get('[aria-label="AI edit prompt"] textarea').trigger('focus')
    await wrapper.get('[aria-label="AI edit prompt"] textarea').setValue(instruction)
    await wrapper.get('[aria-label="Local edit tool"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Costume edit instructions"]').exists()).toBe(true))
    expect(wrapper.find('[aria-label="Save resource"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Undo edit"]').exists()).toBe(false)
    expect(state.spriteState!.aiCommenting).toBe(true)
    const edit = state.spriteEditState.edits[0]
    const gen = edit.costumes[0]
    await vi.waitFor(() => expect(edit.getCostumeInstruction(gen.id)).toBe(instruction))
    gen.setEditComments([{ id: 'local-edit', x: 0.5, y: 0.5, content: 'Make it blue' }])
    await nextTick()
    expect(gen.editComments).toHaveLength(1)
    expect(edit.getCostumeInstruction(gen.id)).toBe(instruction)
    await wrapper.get('[aria-label="Local edit tool"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Remove local edit 1"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Remove local edit 1"]').trigger('click')
    expect(gen.editComments).toHaveLength(0)
    expect(state.spriteState!.aiCommenting).toBe(false)
    edit.editHistory.record(gen)
    const changed = original.clone(true)
    changed.setImg(image('blue'))
    gen.setImage(changed.img)
    await gen.finish()
    await nextTick()
    expect(sprite.costumes[0]).toBe(original)
    await wrapper.get('[aria-label="Undo edit"]').trigger('click')
    expect(edit.costumes[0].result!.id).toBe(original.id)
    await wrapper.get('[aria-label="Redo edit"]').trigger('click')
    expect(edit.costumes[0].result!.img.name).toBe('blue.svg')
    expect(wrapper.find('[aria-label="Save resource"]').exists()).toBe(true)
    expect(edit.costumes[0].result!.img.name).toBe('blue.svg')
    expect(edit.getCostumeInstruction(gen.id)).toBe(instruction)
    expect(sprite.costumes[0]).toBe(original)
    expect(state.spriteEditState.edits[0]).toBe(edit)
    await wrapper.get('[aria-label="Save resource"]').trigger('click')
    await vi.waitFor(() => expect(edit.editHistory.canUndo(gen.id)).toBe(false))
    expect(sprite.costumes.some((costume) => costume.img.name === 'blue.svg')).toBe(true)
    await vi.waitFor(() => expect(wrapper.get('[aria-label="Edit resource"]').isVisible()).toBe(true))
  })

  it.each(['costume', 'animation'] as const)('edits a %s in place without losing the instruction', async (type) => {
    const { wrapper, state, sprite } = await setupCanvas()
    if (type === 'animation') {
      const animation = Animation.create('Walk', [new Costume('frame', image('orange'))])
      sprite.addAnimation(animation)
      state.spriteState!.selectAnimation(animation.id)
      await nextTick()
    }
    const generate = vi
      .spyOn(SpriteEdit.prototype, type === 'costume' ? 'editCostume' : 'editAnimation')
      .mockResolvedValue()
    const input = wrapper.get('[aria-label="AI edit prompt"] textarea')
    expect(wrapper.get('[aria-label="Edit resource"]').isVisible()).toBe(true)
    expect(input.attributes('placeholder')).toBe(`Describe changes to this ${type}`)
    await input.trigger('focus')
    const instruction = 'Make it blue'
    await input.setValue(instruction)
    await input.trigger('focusout')
    expect(wrapper.get('[aria-label="Edit resource"]').isVisible()).toBe(true)
    expect((input.element as HTMLTextAreaElement).value).toBe(instruction)
    await wrapper.get('[aria-label="Edit resource"]').trigger('click')
    await vi.waitFor(() => expect(generate).toHaveBeenCalledOnce())
    const edit = state.spriteEditState.edits[0]
    expect(generate).toHaveBeenCalledWith(edit.selectedItem!.id, instruction)
    expect(edit.selectedItem!.type).toBe(type)
    expect(sprite.costumes[0].img.name).toBe('orange.svg')
  })
})
