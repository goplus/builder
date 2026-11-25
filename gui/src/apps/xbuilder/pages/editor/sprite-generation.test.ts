import { describe, expect, it, vi } from 'vitest'
import { setupAigcMock } from '@/models/spx/gen/aigc-mock'
import { mountPages, setupPageTests, signIn } from '@/apps/xbuilder/pages/test'
import * as cloud from '@/models/common/cloud'
import { fromText } from '@/models/common/file'
import { mockSaveFile } from '@/models/spx/gen/test-helpers'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'

const api = setupAigcMock()

describe('sprite generation', () => {
  setupPageTests()

  it('adds the chosen sprite, then generates, reviews and applies a suggested costume in the editor', async () => {
    api.reset()
    await signIn()
    mockSaveFile()
    vi.spyOn(cloud, 'createFileWithUniversalUrl').mockImplementation((url) =>
      fromText('fox.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"/>', {
        meta: { universalUrl: url, imgSize: { width: 64, height: 64 } }
      })
    )
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
})
