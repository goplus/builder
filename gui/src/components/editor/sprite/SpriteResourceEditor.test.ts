import { flushPromises, shallowMount } from '@vue/test-utils'
import { computed, defineComponent, h, nextTick, ref, toValue } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { useRenderableImageUrl } from '@/utils/img-rendering'
import { mockFile } from '@/models/common/test'
import { Animation } from '@/models/spx/animation'
import { Costume } from '@/models/spx/costume'
import { SpriteEdit } from '@/models/spx/edit/sprite-edit'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import { UIImg, UIMenuItem } from '@/components/ui'
import CostumeGenItem from '@/components/asset/gen/costume/CostumeGenItem.vue'
import AnimationGenItem from '@/components/asset/gen/animation/AnimationGenItem.vue'
import CostumesAutoPlayer from '@/components/common/CostumesAutoPlayer.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import SpriteEditor, { SpriteEditorState } from './SpriteEditor.vue'
import SpriteResourceEditor from './SpriteResourceEditor.vue'
import CostumeItem from './CostumeItem.vue'
import AnimationItem from './AnimationItem.vue'
import CornerMenu from '../common/CornerMenu.vue'
import { DuplicateMenuItem, RenameMenuItem, RemoveMenuItem } from '../common'

const importMocks = vi.hoisted(() => ({ upload: vi.fn(), group: vi.fn() }))
const menuMocks = vi.hoisted(() => ({ rename: vi.fn(), removeAnimation: vi.fn() }))

vi.mock('@/components/asset', () => ({
  useApplySpriteEdit: () => vi.fn(),
  useAddCostumeFromLocalFile: () => importMocks.upload,
  useAddAnimationByGroupingCostumes: () => importMocks.group,
  useRenameCostume: () => menuMocks.rename,
  useRenameAnimation: () => menuMocks.rename,
  useRenameCostumeGen: () => vi.fn(),
  useRenameAnimationGen: () => vi.fn()
}))
vi.mock('../EditorContextProvider.vue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../EditorContextProvider.vue')>()),
  useEditorCtx: vi.fn()
}))
vi.mock('@/utils/img-rendering', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/img-rendering')>()),
  useRenderableImageUrl: vi.fn()
}))
vi.mock('@/components/ui/modal/UIModalProvider.vue', () => ({
  useModal: () => menuMocks.removeAnimation
}))
vi.mock('@/components/ui/message/UIMessageProvider.vue', () => ({
  useMessage: () => ({ error: vi.fn() })
}))

it('activates local editing after switching sprites in the same editor', async () => {
  const i18n = createI18n({ lang: 'en' })
  const project = new SpxProject()
  const sprites = ['Cat', 'Cow'].map((name) => {
    const sprite = new Sprite(name)
    sprite.addCostume(new Costume('default', mockFile(`${name}.png`)))
    project.addSprite(sprite)
    return sprite
  })
  const states = sprites.map((sprite) => {
    const state = new SpriteEditorState(() => sprite)
    state.openAIEditor('costume')
    return state
  })
  const edits = sprites.map((sprite) => SpriteEdit.fromSprite(i18n, project, sprite))
  const state = {
    spriteState: states[0],
    spriteEditState: { edits, finish: vi.fn() }
  }
  vi.mocked(useEditorCtx).mockReturnValue({ project, state } as unknown as ReturnType<typeof useEditorCtx>)
  const selected = ref(0)
  const wrapper = shallowMount(
    defineComponent(
      () => () =>
        h(SpriteEditor, {
          sprite: sprites[selected.value],
          state: states[selected.value]
        })
    ),
    {
      global: {
        plugins: [i18n],
        stubs: {
          SpriteEditor: false,
          SpriteResourceEditor: false,
          EditorList: { template: '<div><slot name="detail" /></div>' },
          SpriteContentEditor: {
            props: ['commenting'],
            emits: ['update:commenting'],
            template:
              '<button :aria-pressed="commenting" @click="$emit(\'update:commenting\', !commenting)">Local edit</button>'
          }
        },
        directives: { radar: () => {} }
      }
    }
  )
  onTestFinished(() => {
    wrapper.unmount()
    states.forEach((state) => state.dispose())
    edits.forEach((edit) => edit.dispose())
    project.dispose()
  })
  expect(wrapper.get('button').attributes('aria-pressed')).toBe('false')
  state.spriteState = states[1]
  selected.value = 1
  await nextTick()
  await wrapper.get('button').trigger('click')
  expect(states[1].aiCommenting).toBe(true)
  expect(states[0].aiCommenting).toBe(false)
  expect(wrapper.get('button').attributes('aria-pressed')).toBe('true')
  await wrapper.get('button').trigger('click')
  expect(states[1].aiCommenting).toBe(false)
  expect(wrapper.get('button').attributes('aria-pressed')).toBe('false')
})

describe('SpriteResourceEditor thumbnails', () => {
  it.each(['costume', 'animation'] as const)(
    'shows only the adopted %s until its replacement is applied',
    async (type) => {
      vi.mocked(useRenderableImageUrl).mockImplementation((source) => [
        computed(() => toValue(source)?.name ?? null),
        ref(false)
      ])
      const i18n = createI18n({ lang: 'en' })
      const project = new SpxProject()
      const sprite = new Sprite('Cat')
      const costume = new Costume('idle', mockFile('adopted.png'))
      const animation = new Animation('walk')
      animation.setCostumes([new Costume('frame', mockFile('adopted-frame.png'))])
      sprite.addCostume(costume)
      sprite.addAnimation(animation)
      project.addSprite(sprite)
      const edit = SpriteEdit.fromSprite(i18n, project, sprite)
      const selectedCostumeId = ref(costume.id)
      const selectedAnimationId = ref(animation.id)
      vi.mocked(useEditorCtx).mockReturnValue({
        project,
        state: {
          get selectedCostume() {
            return sprite.costumes.find(({ id }) => id === selectedCostumeId.value)
          },
          get selectedAnimation() {
            return sprite.animations.find(({ id }) => id === selectedAnimationId.value)
          },
          selectCostume: (_spriteId: string, id: string) => (selectedCostumeId.value = id),
          selectAnimation: (_spriteId: string, id: string) => (selectedAnimationId.value = id),
          history: { doAction: async (_action: unknown, apply: () => unknown) => apply() },
          spriteEditState: { edits: [edit], finish: vi.fn() },
          spriteState: {
            selectCostume: (id: string) => (selectedCostumeId.value = id),
            selectAnimation: (id: string) => (selectedAnimationId.value = id)
          }
        }
      } as unknown as ReturnType<typeof useEditorCtx>)
      const wrapper = shallowMount(
        defineComponent(() => () => h(SpriteResourceEditor, { sprite, type })),
        {
          global: {
            plugins: [i18n],
            renderStubDefaultSlot: true,
            stubs: {
              SpriteResourceEditor: false,
              EditorList: {
                template:
                  '<div><section data-adopted><slot /></section><section data-drafts><slot name="drafts" /></section><slot name="detail" /></div>'
              },
              SpriteContentEditor: { template: '<div />' },
              CostumeItem: false,
              AnimationItem: false,
              UIEditorSpriteItem: false,
              CornerMenu: { template: '<div><slot /></div>' },
              CostumeGenItem: false,
              AnimationGenItem: false,
              GenItem: false
            },
            directives: { radar: () => {} }
          }
        }
      )
      onTestFinished(() => {
        wrapper.unmount()
        edit.dispose()
        project.dispose()
      })
      const item = wrapper.getComponent(type === 'costume' ? CostumeItem : AnimationItem)
      const menu = item.getComponent(CornerMenu)
      expect(menu.findComponent(DuplicateMenuItem).exists()).toBe(true)
      expect(menu.findComponent(RenameMenuItem).exists()).toBe(true)
      expect(menu.findComponent(RemoveMenuItem).exists()).toBe(true)
      if (type === 'costume') expect(menu.getComponent(RemoveMenuItem).attributes('disabled')).toBeDefined()
      expect(menu.findComponent(UIMenuItem).exists()).toBe(false)
      const originalImage = type === 'costume' ? costume.img : animation.costumes[0].img
      expect(item.getComponent(UIImg).props('src')).toBe(originalImage.name)

      const draftImage = mockFile('draft.png')
      const gen = type === 'costume' ? edit.costumes[0] : edit.animations[0]
      if (type === 'costume') {
        edit.costumes[0].setImage(draftImage)
        edit.costumes[0].result!.setImg(draftImage)
      } else {
        edit.animations[0].result!.setCostumes([new Costume('edited-frame', draftImage)])
        edit.animations[0].result!.setDuration(2)
      }
      await nextTick()
      expect(item.getComponent(UIImg).props('src')).toBe(originalImage.name)
      if (type === 'animation') {
        await item.trigger('mouseenter')
        expect(item.getComponent(CostumesAutoPlayer).props('costumes')).toEqual(animation.costumes)
        expect(item.getComponent(CostumesAutoPlayer).props('duration')).toBe(animation.duration)
        await item.trigger('mouseleave')
      }

      edit.applyToSprite(sprite, { type, id: gen.id })
      await nextTick()
      expect(item.getComponent(UIImg).props('src')).toBe(draftImage.name)

      if (type === 'costume') {
        const pending = edit.addCostume()
        pending.setImage(mockFile('unadopted.png'))
      } else {
        edit.addAnimation()
      }
      await nextTick()
      const pendingItem = wrapper.getComponent(type === 'costume' ? CostumeGenItem : AnimationGenItem)
      expect(pendingItem.findComponent(UIImg).exists()).toBe(false)
      expect(
        wrapper
          .get('[data-drafts]')
          .findComponent(type === 'costume' ? CostumeGenItem : AnimationGenItem)
          .exists()
      ).toBe(true)
      const pending = type === 'costume' ? edit.costumes[1] : edit.animations[1]
      const generated =
        type === 'costume'
          ? new Costume('generated', mockFile('generated.png'))
          : Animation.create('generated', [new Costume('frame', mockFile('generated.png'))])
      vi.spyOn(pending, 'result', 'get').mockReturnValue(generated)
      await nextTick()
      expect(
        wrapper
          .get('[data-drafts]')
          .findComponent(type === 'costume' ? CostumeGenItem : AnimationGenItem)
          .exists()
      ).toBe(true)
      edit.applyToSprite(sprite, { type, id: pending.id })
      await nextTick()
      expect(
        wrapper
          .get('[data-drafts]')
          .findComponent(type === 'costume' ? CostumeGenItem : AnimationGenItem)
          .exists()
      ).toBe(false)
      expect(
        wrapper.get('[data-adopted]').findAllComponents(type === 'costume' ? CostumeItem : AnimationItem)
      ).toHaveLength(2)

      menuMocks.rename.mockImplementationOnce(async (resource: Costume | Animation) => resource.setName('renamed'))
      await menu.getComponent(RenameMenuItem).trigger('click')
      await flushPromises()
      const saved = type === 'costume' ? sprite.costumes[0] : sprite.animations[0]
      expect(saved.name).toBe('renamed')
      expect(gen.name).toBe('renamed')
      expect(edit.hasResourceChanges({ type, id: gen.id })).toBe(false)

      if (type === 'animation') {
        menuMocks.removeAnimation.mockImplementationOnce(async ({ animation }: { animation: Animation }) => {
          sprite.removeAnimation(animation.id)
        })
      }
      await menu.getComponent(RemoveMenuItem).trigger('click')
      await flushPromises()
      expect((type === 'costume' ? sprite.costumes : sprite.animations).some(({ id }) => id === saved.id)).toBe(false)
      expect((type === 'costume' ? edit.costumes : edit.animations).some(({ id }) => id === gen.id)).toBe(false)

      const remainingItem = wrapper.getComponent(type === 'costume' ? CostumeItem : AnimationItem)
      const beforeDuplicate = type === 'costume' ? sprite.costumes.length : sprite.animations.length
      await remainingItem.getComponent(DuplicateMenuItem).trigger('click')
      await flushPromises()
      const resources = type === 'costume' ? sprite.costumes : sprite.animations
      expect(resources).toHaveLength(beforeDuplicate + 1)
      const selectedId = type === 'costume' ? selectedCostumeId.value : selectedAnimationId.value
      const selectedGen = (type === 'costume' ? edit.costumes : edit.animations).find(
        (gen) => gen.result?.id === selectedId
      )!
      expect(edit.selectedItem).toEqual({ type, id: selectedGen.id })
      expect(edit.isNewResource(edit.selectedItem!)).toBe(false)
    }
  )
})

describe('SpriteResourceEditor creation methods', () => {
  it.each(['costume', 'animation'] as const)(
    'imports a %s into the source while preserving other drafts',
    async (type) => {
      const i18n = createI18n({ lang: 'en' })
      const project = new SpxProject()
      const sprite = new Sprite('Cat')
      sprite.addCostume(new Costume('default', mockFile('default.png')))
      project.addSprite(sprite)
      const edit = SpriteEdit.fromSprite(i18n, project, sprite)
      const otherDraft = edit.addCostume()
      otherDraft.setSettings({ description: 'Keep this prompt' })
      const draft = type === 'costume' ? edit.addCostume() : edit.addAnimation()
      edit.setSelectedItem({ type, id: draft.id })
      const imported =
        type === 'costume'
          ? new Costume('uploaded', mockFile('uploaded.png'))
          : Animation.create('grouped', [sprite.costumes[0].clone()])
      importMocks.upload.mockImplementation(async (target: Sprite) => {
        expect(target).toBe(sprite)
        target.addCostume(imported as Costume)
        return [imported]
      })
      importMocks.group.mockImplementation(async (targetProject: SpxProject, target: Sprite) => {
        expect(targetProject).toBe(project)
        expect(target).toBe(sprite)
        target.addAnimation(imported as Animation)
        return imported
      })
      vi.mocked(useEditorCtx).mockReturnValue({
        project,
        state: {
          spriteEditState: { edits: [edit], finish: vi.fn() },
          spriteState: { selectCostume: vi.fn(), selectAnimation: vi.fn() }
        }
      } as unknown as ReturnType<typeof useEditorCtx>)
      const wrapper = shallowMount(
        defineComponent(() => () => h(SpriteResourceEditor, { sprite, type })),
        {
          global: {
            plugins: [i18n],
            stubs: {
              SpriteResourceEditor: false,
              EditorList: { template: '<div><slot /><slot name="add-options" /><slot name="detail" /></div>' },
              UIMenu: { template: '<div><slot /></div>' },
              SpriteContentEditor: { template: '<div><slot name="settings" /></div>' }
            },
            directives: { radar: () => {} }
          }
        }
      )
      onTestFinished(() => {
        wrapper.unmount()
        edit.dispose()
        project.dispose()
      })
      await wrapper.findAllComponents(UIMenuItem)[0].trigger('click')
      await flushPromises()
      const items = type === 'costume' ? edit.costumes : edit.animations
      expect(items.some((gen) => gen.id === draft.id)).toBe(true)
      const saved = items.find((gen) => gen.result?.id === imported.id)!
      expect(edit.selectedItem).toEqual({ type, id: saved.id })
      expect(edit.isNewResource(edit.selectedItem!)).toBe(false)
      expect(edit.getCostumeById(otherDraft.id)?.settings.description).toBe('Keep this prompt')
      expect(wrapper.findAllComponents(UIMenuItem)).toHaveLength(2)
    }
  )
})
