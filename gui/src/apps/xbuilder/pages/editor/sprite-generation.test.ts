import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupAigcMock } from '@/models/spx/gen/aigc-mock' // Put me before importing `@/apis/aigc` to ensure the mock is set up correctly
import { mountPages, setupPageTests, signIn } from '@/apps/xbuilder/pages/test' // Initializes page mocks before app modules load
import { createI18n } from '@/utils/i18n'
import { TaskType } from '@/apis/aigc'
import { createProjectRelease } from '@/apis/project-release'
import * as cloud from '@/models/common/cloud'
import { fromText } from '@/models/common/file'
import { CostumeGen } from '@/models/spx/gen/costume-gen'
import { AnimationGen } from '@/models/spx/gen/animation-gen'
import { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { mockSaveFile } from '@/models/spx/gen/test-helpers'
import ProjectPublishedModal from '@/components/project/ProjectPublishedModal.vue'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'

const api = setupAigcMock()

describe('sprite generation', () => {
  setupPageTests()

  beforeEach(async () => {
    api.reset()
    await signIn()
    mockSaveFile()
    vi.spyOn(cloud, 'createFileWithUniversalUrl').mockImplementation((url) =>
      fromText('fox.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"/>', {
        meta: { universalUrl: url, imgSize: { width: 64, height: 64 } }
      })
    )
  })

  it('adds the chosen sprite, then generates, reviews and applies a suggested costume in the editor', async () => {
    const { wrapper } = await mountPages('/editor/alice/First%20flight')
    const get = (label: string) => wrapper.get(`[aria-label="${label}"]`)
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Sprites panel"]').exists()).toBe(true), { timeout: 4000 })
    await get('Sprites panel').get('[aria-label="Add"]').trigger('click')
    await get('Generate sprite').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Sprite generation modal"]').exists()).toBe(true))
    const modal = get('Sprite generation modal')
    await modal.get('textarea').setValue('A fox')
    const submit = modal.get('[aria-label="Submit"]')
    await submit.trigger('click')
    await vi.waitFor(() => expect(modal.get('textarea').element.value).toContain('Enriched'))
    await submit.trigger('click')
    await vi.waitFor(() => expect(modal.findAll('[aria-label="Sprite image item"] img')).toHaveLength(4))
    await modal.get('[aria-label="Sprite image item"]').trigger('click')
    await modal.get('[aria-label="Add sprite"]').trigger('click')
    const project = wrapper.getComponent(EditorContextProvider).props('project')
    await vi.waitFor(() => expect(project.sprites).toHaveLength(1))
    const [sprite] = project.sprites
    expect(sprite.costumes).toHaveLength(1)
    await get('Costumes tab').trigger('click')
    await vi.waitFor(() => expect(wrapper.findAll('[aria-label^="Costume generation item"]')).toHaveLength(2))
    await wrapper.get('[aria-label^="Costume generation item"]').trigger('click')
    await get('Costume generation settings').get('[aria-label="Submit"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Version 1'))
    await get('Costume generation settings').get('[aria-label="Submit"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Version 2'))
    await get('Previous version').trigger('click')
    expect(wrapper.text()).toContain('Version 1')
    await get('Apply result').trigger('click')
    await vi.waitFor(() => expect(sprite.costumes).toHaveLength(2))
    expect(sprite.defaultCostume?.name).toBe('costume-1')
    expect(wrapper.findAll('[aria-label^="Costume generation item"]')).toHaveLength(1)
  })
  it('reopens both costume versions after publishing the project', async () => {
    const path = '/editor/alice/First%20flight'
    let stored = await cloud.cloudHelpers.load('alice', 'First flight')
    vi.spyOn(cloud.cloudHelpers, 'load').mockImplementation(async () => stored)
    vi.spyOn(cloud.cloudHelpers, 'save').mockImplementation(async ({ metadata, files }) => {
      stored = { metadata: { ...stored.metadata, ...metadata, revision: stored.metadata.revision + 1 }, files }
      return { metadata: { ...stored.metadata, latestRelease: null }, files }
    })
    vi.mocked(createProjectRelease, { partial: true }).mockResolvedValue({ name: 'v1.0.0' })
    const { wrapper } = await mountPages(path + '?publish')
    const form = '[aria-label="Project publish modal"] form'
    await vi.waitFor(() => expect(wrapper.find(form).exists()).toBe(true), { timeout: 4000 })
    const { project, state } = wrapper.getComponent(EditorContextProvider).props()
    const gen = new SpriteGen(createI18n({ lang: 'en' }), project, { settings: { name: 'Fox', description: 'A fox' } })
    await gen.genImages()
    gen.setImageIndex(0)
    const sprite = await gen.finishWithDefaultCostume()
    project.addSprite(sprite)
    const draft = state.genState.spriteResources.addCostume(sprite)
    expect.assert(draft.gen instanceof CostumeGen)
    for (const description of ['Red scarf', 'Green scarf']) {
      draft.gen.setSettings({ description })
      await draft.gen.generate()
    }
    draft.select(0)
    await wrapper.get(form).trigger('submit')
    await vi.waitFor(() => expect(wrapper.findComponent(ProjectPublishedModal).exists()).toBe(true))
    wrapper.getComponent(ProjectPublishedModal).vm.$emit('resolved')
    wrapper.unmount()

    const { wrapper: reopened } = await mountPages(path)
    await vi.waitFor(() => expect(reopened.findComponent(EditorContextProvider).exists()).toBe(true))
    const { project: savedGame, state: savedEditor } = reopened.getComponent(EditorContextProvider).props()
    expect(savedGame.sprites[0].costumes).toHaveLength(1)
    const [restored] = savedEditor.genState.spriteResources.drafts
    expect(restored.id).toBe(draft.id)
    expect(restored.index).toBe(0)
    expect(restored.gen.settings.description).toBe('Red scarf')
    restored.select(1)
    expect(restored.gen.settings.description).toBe('Green scarf')
  })
  /** Opens a sprite with one applied animation and shows a second generated animation ready to apply. */
  async function openSecondAnimationDraft() {
    const { wrapper } = await mountPages('/editor/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Sprites panel"]').exists()).toBe(true), { timeout: 4000 })
    const { project, state } = wrapper.getComponent(EditorContextProvider).props()
    vi.mocked(cloud.createFileWithUniversalUrl).mockImplementation((url) =>
      fromText('fox.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"/>', {
        meta: { universalUrl: url, imgSize: { width: 512, height: 512 } }
      })
    )
    const gen = new SpriteGen(createI18n({ lang: 'en' }), project, { settings: { name: 'Fox', description: 'A fox' } })
    await gen.genImages()
    gen.setImageIndex(0)
    const sprite = await gen.finishWithDefaultCostume()
    await state.history.doAction({ name: { en: 'Add sprite', zh: '添加精灵' } }, () => project.addSprite(sprite))
    state.selectSprite(sprite.id)
    const resources = state.genState.spriteResources
    const drafts = [resources.addAnimation(sprite), resources.addAnimation(sprite)]
    for (const draft of drafts) {
      expect.assert(draft.gen instanceof AnimationGen)
      await draft.gen.generateVideo()
      draft.gen.setFramesConfig({ startTime: 0, duration: 400, interval: 100 })
    }
    await resources.adopt(drafts[0], state.history)
    await wrapper.get('[aria-label="Animations tab"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.findAll('[aria-label^="Animation generation item"]')).toHaveLength(1))
    await wrapper.get('[aria-label^="Animation generation item"]').trigger('click')
    const detailName = () => wrapper.get('[aria-label^="Item detail"] h4').text()
    return { wrapper, sprite, detailName }
  }
  it('shows the applied animation after applying a second generated animation', async () => {
    const { wrapper, sprite, detailName } = await openSecondAnimationDraft()
    await wrapper.get('[aria-label="Apply result"]').trigger('click')
    await vi.waitFor(() => expect(sprite.animations).toHaveLength(2))
    await vi.waitFor(() => expect(detailName()).toBe(sprite.animations[1].name))
  })
  it('keeps another animation selected while a generated animation is being applied', async () => {
    const { wrapper, sprite, detailName } = await openSecondAnimationDraft()
    let extract = () => {}
    const extracting = new Promise<void>((resolve) => (extract = resolve))
    api.registerTaskHandler(TaskType.ExtractVideoFrames, async function* (_task, _params, defaultHandler) {
      await extracting
      yield* defaultHandler()
    })
    await wrapper.get('[aria-label="Apply result"]').trigger('click')
    const [first] = sprite.animations
    await wrapper.get('[aria-label="Animations management"]').get(`[title="${first.name}"]`).trigger('click')
    await vi.waitFor(() => expect(detailName()).toBe(first.name))
    extract()
    await vi.waitFor(() => expect(sprite.animations).toHaveLength(2))
    await flushPromises()
    expect(detailName()).toBe(first.name)
  })
  it('resumes a saved sprite in the original modal and prepares its costumes there', async () => {
    const { wrapper } = await mountPages('/editor/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Sprites panel"]').exists()).toBe(true), { timeout: 4000 })
    const { project, state } = wrapper.getComponent(EditorContextProvider).props()
    const legacy = new SpriteGen(createI18n({ lang: 'en' }), project, {
      settings: { name: 'Fox', description: 'A fox' }
    })
    await legacy.genImages()
    legacy.setImageIndex(0)
    state.genState.addSprite(legacy)
    await vi.waitFor(() => expect(wrapper.find('[aria-label^="Sprite generation item"]').exists()).toBe(true))
    await wrapper.get('[aria-label^="Sprite generation item"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Next"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Next"]').trigger('click')
    await vi.waitFor(() => expect(legacy.isPreparePhase).toBe(false))
    expect(legacy.costumes.length).toBeGreaterThan(1)
    expect(project.sprites).toHaveLength(0)
    expect(state.genState.spriteResources.drafts).toHaveLength(0)
  })
  it('returns from a costume draft to the current default costume without adding a history step', async () => {
    const { wrapper } = await mountPages('/editor/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Sprites panel"]').exists()).toBe(true), { timeout: 4000 })
    const { project, state } = wrapper.getComponent(EditorContextProvider).props()
    const gen = new SpriteGen(createI18n({ lang: 'en' }), project, { settings: { name: 'Fox', description: 'A fox' } })
    await gen.genImages()
    gen.setImageIndex(0)
    const sprite = await gen.finishWithDefaultCostume()
    await state.history.doAction({ name: { en: 'Add sprite', zh: '添加精灵' } }, () => project.addSprite(sprite))
    await state.history.doAction({ name: { en: 'Move sprite', zh: '移动精灵' } }, () => sprite.setX(10))
    await state.history.undo()
    const currentSprite = project.sprites[0]
    state.selectSprite(currentSprite.id)
    state.genState.spriteResources.addCostume(currentSprite)
    await wrapper.get('[aria-label="Costumes tab"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label^="Costume generation item"]').exists()).toBe(true))
    await wrapper.get('[aria-label^="Costume generation item"]').trigger('click')
    expect(state.spriteState?.costumesState.selectedDraft).not.toBeNull()
    await wrapper.get('[aria-label^="Costume item"]').trigger('click')
    await flushPromises()
    expect(state.spriteState?.costumesState.selectedDraft).toBeNull()
    expect(state.spriteState?.costumesState.selected?.id).toBe(currentSprite.defaultCostume?.id)
    expect(state.history.getUndoAction()?.name.en).toBe('Add sprite')
    expect(state.history.getRedoAction()?.name.en).toBe('Move sprite')
  })
})
