import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages, signIn, makeAsset } from '@/apps/xbuilder/pages/test'
import { AssetType } from '@/apis/asset'
import * as assetApis from '@/apis/asset'
import { Visibility } from '@/apis/project'
import EditorNavbar from '@/components/editor/navbar/EditorNavbar.vue'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'

describe('editor', () => {
  setupPageTests()

  it('opens the editor and creates, edits and manages a monitor', async () => {
    const { wrapper } = await mountPages('/editor/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Stage overview"]').exists()).toBe(true), { timeout: 4000 })
    await wrapper.get('[aria-label="Stage overview"]').trigger('click')
    await wrapper.get('[aria-label="Sounds tab"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('No sounds'))
    await wrapper.get('[aria-label="Widgets tab"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('No widgets'))
    await wrapper.get('[aria-label="Add monitor button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Label input"] input').exists()).toBe(true))
    await wrapper.get('[aria-label="Label input"] input').setValue('Score')
    const project = wrapper.getComponent(EditorContextProvider).props('project')
    await vi.waitFor(() => expect(project.stage.widgets[0].label).toBe('Score'))
    await wrapper.get('[aria-label="Widgets management"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Visibility control"]').exists()).toBe(true))
    await wrapper
      .findAll('[aria-label="Visibility control"]')
      .find((control) => control.text() === 'Hide Widget')!
      .trigger('click')
    await vi.waitFor(() => expect(project.stage.widgets[0].visible).toBe(false))
    await wrapper.get('[aria-label="Widgets management"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Duplicate"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Duplicate"]').trigger('click')
    await vi.waitFor(() => expect(project.stage.widgets).toHaveLength(2))
    expect(project.stage.widgets[1].label).toBe('Score')
    await wrapper.get('[aria-label="Widgets management"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Remove"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Remove"]').trigger('click')
    await vi.waitFor(() => expect(project.stage.widgets).toHaveLength(1))
    await wrapper.get('[aria-label="Widgets management"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Rename"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename modal"]').exists()).toBe(true))
    const rename = wrapper.get('[aria-label="Rename modal"]')
    await rename.get('[aria-label="Name input"] input').setValue('ScoreDisplay')
    await rename.get('form').trigger('submit')
    await vi.waitFor(() => expect(project.stage.widgets[0].name).toBe('ScoreDisplay'))
  })

  it('searches the asset library, imports a backdrop and manages it with undo and redo', async () => {
    await signIn()
    const config = { name: 'Grassland', path: 'grass.svg', x: 240, y: 180, imageWidth: 480, imageHeight: 360 }
    vi.mocked(assetApis.listAssets).mockResolvedValue({
      total: 1,
      data: [
        makeAsset('Grassland', AssetType.Backdrop, {
          'assets/__backdrop__.json': `data:application/json,${encodeURIComponent(JSON.stringify(config))}`,
          'assets/grass.svg': `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="green"/></svg>')}`
        })
      ]
    })
    vi.mocked(assetApis.listSignedInUserAssets).mockResolvedValue({ total: 0, data: [] })
    const { wrapper } = await mountPages('/editor/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Backdrops quick entry"]').exists()).toBe(true), {
      timeout: 4000
    })
    await wrapper.get('[aria-label="Backdrops quick entry"]').trigger('click')
    await wrapper.get('[aria-label="Add backdrop"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Add from asset library"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Add from asset library"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Asset library modal"]').exists()).toBe(true))
    const modal = wrapper.get('[aria-label="Asset library modal"]')
    await vi.waitFor(() => expect(modal.text()).toContain('Grassland'))
    await modal.get('input[placeholder="Search"]').setValue('grass')
    await vi.waitFor(() =>
      expect(assetApis.listAssets).toHaveBeenLastCalledWith(
        expect.objectContaining({ keyword: 'grass', type: AssetType.Backdrop, visibility: Visibility.Public })
      )
    )
    await modal
      .findAll('button')
      .find((button) => button.text() === 'My library')!
      .trigger('click')
    await vi.waitFor(() =>
      expect(assetApis.listSignedInUserAssets).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: 'grass', type: AssetType.Backdrop })
      )
    )
    await vi.waitFor(() => expect(modal.text()).toContain('No data'))
    await modal
      .findAll('button')
      .find((button) => button.text() === 'Public library')!
      .trigger('click')
    await vi.waitFor(() => expect(modal.text()).toContain('Grassland'))

    await modal
      .get('[aria-label="Asset list"]')
      .findAll('[title]')
      .find((item) => item.attributes('title') === 'Grassland')!
      .trigger('click')
    await modal.get('[aria-label="Confirm button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Asset library modal"]').exists()).toBe(false))
    const project = wrapper.getComponent(EditorContextProvider).props('project')
    expect(project.stage.backdrops.map((backdrop) => backdrop.name)).toContain('Grassland')
    await wrapper.get('[aria-label="Backdrops management"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Rename"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename modal"]').exists()).toBe(true))
    const rename = wrapper.get('[aria-label="Rename modal"]')
    await rename.get('[aria-label="Name input"] input').setValue('Landing')
    await rename.get('form').trigger('submit')
    await vi.waitFor(() => expect(project.stage.backdrops.map((backdrop) => backdrop.name)).toEqual(['Landing']))
    const history = wrapper.getComponent(EditorNavbar).findAll('button')
    await history[0].trigger('click')
    await vi.waitFor(() => expect(project.stage.backdrops.map((backdrop) => backdrop.name)).toEqual(['Grassland']))
    await history[1].trigger('click')
    await vi.waitFor(() => expect(project.stage.backdrops.map((backdrop) => backdrop.name)).toEqual(['Landing']))
    await wrapper.get('[aria-label="Backdrop mode selector"] [aria-label="Scale"]').trigger('click')
    await vi.waitFor(() => expect(project.stage.mapMode).toBe('fillRatio'))
    await wrapper.get('[aria-label="Backdrops management"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Duplicate"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Duplicate"]').trigger('click')
    await vi.waitFor(() => expect(project.stage.backdrops).toHaveLength(2))
    await wrapper.get('[aria-label="Backdrops management"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Remove"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Remove"]').trigger('click')
    await vi.waitFor(() => expect(project.stage.backdrops.map((backdrop) => backdrop.name)).toEqual(['Landing']))
  })

  it('imports a sprite, selects its costume and groups costumes into an animation', async () => {
    const costumes = ['Idle', 'Flying'].map((name) => ({
      name,
      path: `${name}.svg`,
      x: 24,
      y: 18,
      imageWidth: 48,
      imageHeight: 36
    }))
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="36"><rect width="48" height="36" fill="blue"/></svg>'
    vi.mocked(assetApis.listAssets).mockResolvedValue({
      total: 1,
      data: [
        makeAsset('Spaceship', AssetType.Sprite, {
          'assets/sprites/Spaceship/index.json': `data:application/json,${encodeURIComponent(JSON.stringify({ costumes }))}`,
          'assets/sprites/Spaceship/Idle.svg': `data:image/svg+xml,${encodeURIComponent(svg)}`,
          'assets/sprites/Spaceship/Flying.svg': `data:image/svg+xml,${encodeURIComponent(svg)}`
        })
      ]
    })
    const { wrapper } = await mountPages('/editor/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Sprites panel"]').exists()).toBe(true), { timeout: 4000 })
    await wrapper.get('[aria-label="Sprites panel"]').get('[aria-label="Add"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Add from asset library"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Add from asset library"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Asset library modal"]').exists()).toBe(true))
    const library = wrapper.get('[aria-label="Asset library modal"]')
    await vi.waitFor(() => expect(library.text()).toContain('Spaceship'))
    await library.get('[title="Spaceship"]').trigger('click')
    await library.get('[aria-label="Confirm button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Costumes tab"]').exists()).toBe(true))
    const project = wrapper.getComponent(EditorContextProvider).props('project')
    expect(project.sprites[0].name).toBe('Spaceship')
    await wrapper.get('[aria-label="Costumes tab"]').trigger('click')
    await wrapper.get('[aria-label="Costumes management"]').get('[title="Flying"]').trigger('click')
    expect(project.sprites[0].defaultCostume?.name).toBe('Flying')
    await wrapper.get('[aria-label="Rename button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename modal"]').exists()).toBe(true))
    const rename = wrapper.get('[aria-label="Rename modal"]')
    await rename.get('[aria-label="Name input"] input').setValue('Flight')
    await rename.get('form').trigger('submit')
    await vi.waitFor(() => expect(project.sprites[0].defaultCostume?.name).toBe('Flight'))
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename modal"]').exists()).toBe(false))

    await wrapper.get('[aria-label="Animations tab"]').trigger('click')
    await wrapper.get('[aria-label="Group costumes button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Group costumes modal"]').exists()).toBe(true))
    const grouping = wrapper.get('[aria-label="Group costumes modal"]')
    await grouping.get('[title="Idle"]').trigger('click')
    await grouping.get('[title="Flight"]').trigger('click')
    await grouping.get('[aria-label="Add animation button"]').trigger('click')
    await vi.waitFor(() => expect(project.sprites[0].animations).toHaveLength(1))
    expect(project.sprites[0].animations[0].costumes.map((costume) => costume.name)).toEqual(['Idle', 'Flight'])
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Edit duration"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Edit duration"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Duration editor dropdown form"]').exists()).toBe(true))
    const duration = wrapper.get('[aria-label="Duration editor dropdown form"]')
    await duration.get('input').setValue('0.8')
    await duration.trigger('submit')
    await vi.waitFor(() => expect(project.sprites[0].animations[0].duration).toBe(0.8))
    await wrapper.get('[aria-label="Rename button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename modal"]').exists()).toBe(true))
    const renameAnimation = wrapper.get('[aria-label="Rename modal"]')
    await renameAnimation.get('[aria-label="Name input"] input').setValue('Fly')
    await renameAnimation.get('form').trigger('submit')
    await vi.waitFor(() => expect(project.sprites[0].animations[0].name).toBe('Fly'))
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename modal"]').exists()).toBe(false))

    await wrapper.get('[aria-label="Edit bound state"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Bound state editor dropdown form"]').exists()).toBe(true))
    const binding = wrapper.get('[aria-label="Bound state editor dropdown form"]')
    await binding.get('[aria-label="State step"]').trigger('click')
    await binding.trigger('submit')
    await vi.waitFor(() =>
      expect(project.sprites[0].getAnimationBoundStates(project.sprites[0].animations[0].id)).toContain('step')
    )

    await wrapper.get('[aria-label="Map edit mode"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Map viewer"]').exists()).toBe(true))
    await wrapper.findAll('[title="Spaceship"]')[0].trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.find('[aria-label="Basic configuration for selected sprite"]').exists()).toBe(true)
    )
    const settings = wrapper.get('[aria-label="Basic configuration for selected sprite"]')
    await settings.get('[aria-label="X position input"] input').setValue('100')
    await vi.waitFor(() => expect(project.sprites[0].x).toBe(100))
    await settings.get('[aria-label="Y position input"] input').setValue('50')
    await vi.waitFor(() => expect(project.sprites[0].y).toBe(50))
    await settings.get('[aria-label="Size input"] input').setValue('75')
    await vi.waitFor(() => expect(project.sprites[0].size).toBe(0.75))
    await settings.get('[aria-label="Heading input"] input').setValue('45')
    await vi.waitFor(() => expect(project.sprites[0].heading).toBe(45))
    await settings.get('[aria-label="Visibility control"]').findAll('[role="button"]')[1].trigger('click')
    await vi.waitFor(() => expect(project.sprites[0].visible).toBe(false))
    await settings.get('[aria-label="Collapse button"]').trigger('click')
    await wrapper.get('[aria-label="Expand button"]').trigger('click')
    expect(wrapper.find('[aria-label="Basic configuration for selected sprite"]').exists()).toBe(true)
    await wrapper.get('[aria-label="Default mode"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Sprites panel"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Sprites panel"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Duplicate"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Duplicate"]').trigger('click')
    await vi.waitFor(() => expect(project.sprites).toHaveLength(2))
    expect(project.sprites[1].x).toBe(110)
    expect(project.sprites[1].y).toBe(40)
    expect(project.sprites[1].animations[0].name).toBe('Fly')
    await wrapper.get('[aria-label="Sprites panel"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Rename"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename modal"]').exists()).toBe(true))
    const renameSprite = wrapper.get('[aria-label="Rename modal"]')
    await renameSprite.get('[aria-label="Name input"] input').setValue('Shuttle')
    await renameSprite.get('form').trigger('submit')
    await vi.waitFor(() => expect(project.sprites[1].name).toBe('Shuttle'))
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename modal"]').exists()).toBe(false))
    await wrapper.get('[aria-label="Sprites panel"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Remove"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Remove"]').trigger('click')
    await vi.waitFor(() => expect(project.sprites.map((sprite) => sprite.name)).toEqual(['Spaceship']))
  })

  it('configures map size and physics through map edit mode', async () => {
    const { wrapper } = await mountPages('/editor/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Stage overview"]').exists()).toBe(true), { timeout: 4000 })
    await wrapper.get('[aria-label="Map edit mode"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Map viewer"]').exists()).toBe(true))
    const project = wrapper.getComponent(EditorContextProvider).props('project')
    await wrapper.get('[aria-label="width input"] input').setValue('960')
    await vi.waitFor(() => expect(project.stage.mapWidth).toBe(960))
    await wrapper.get('[aria-label="height input"] input').setValue('720')
    await vi.waitFor(() => expect(project.stage.mapHeight).toBe(720))
    await wrapper.get('[aria-label="physics input"]').trigger('click')
    await vi.waitFor(() => expect(project.stage.physics.enabled).toBe(true))
    const vertical = wrapper.findAll('label').find((item) => item.text() === 'Vertical')!
    await vertical.trigger('click')
    await vi.waitFor(() => expect(project.stage.layerSortMode).toBe('vertical'))
    await wrapper.get('[aria-label="Default mode"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Stage overview"]').exists()).toBe(true))
  })

  it('imports a sound, previews it and manages its copies', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    vi.spyOn(HTMLMediaElement.prototype, 'duration', 'get').mockReturnValue(1)
    class TestAudioContext {
      state = 'running'
      destination = {}
      createMediaElementSource() {
        return { connect() {} }
      }
      createGain() {
        return { gain: { value: 1 }, connect() {} }
      }
      async decodeAudioData() {
        return { getChannelData: () => new Float32Array(12800).fill(0.25) }
      }
    }
    vi.stubGlobal('AudioContext', TestAudioContext)
    vi.mocked(assetApis.listAssets).mockResolvedValue({
      total: 1,
      data: [
        makeAsset('Beep', AssetType.Sound, {
          'assets/sounds/Beep/index.json': `data:application/json,${encodeURIComponent(JSON.stringify({ path: 'beep.wav', rate: 12800, sampleCount: 12800 }))}`,
          'assets/sounds/Beep/beep.wav': `data:audio/wav;base64,${readFileSync('src/components/project/default-project/assets/sounds/grass footsteps/sound.wav').toString('base64')}`
        })
      ]
    })
    const { wrapper } = await mountPages('/editor/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Sounds quick entry"]').exists()).toBe(true), {
      timeout: 4000
    })
    await wrapper.get('[aria-label="Sounds quick entry"]').trigger('click')
    await wrapper.get('[aria-label="Add sound button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Add from asset library"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Add from asset library"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Asset library modal"]').exists()).toBe(true))
    const library = wrapper.get('[aria-label="Asset library modal"]')
    await vi.waitFor(() => expect(library.text()).toContain('Beep'))
    await library.get('[title="Beep"]').trigger('click')
    await library.get('[aria-label="Confirm button"]').trigger('click')
    const project = wrapper.getComponent(EditorContextProvider).props('project')
    await vi.waitFor(() => expect(project.sounds.map((sound) => sound.name)).toEqual(['Beep']))
    await vi.waitFor(() => expect(wrapper.find('.volume-slider').exists()).toBe(true))
    await wrapper.get('.volume-slider input').setValue('0.5')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Save button"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Cancel button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Save button"]').exists()).toBe(false))
    await wrapper.get('.play-control-play').trigger('click')
    await vi.waitFor(() => expect(play).toHaveBeenCalled())
    await wrapper.get('.play-control-stop').trigger('click')
    await wrapper.get('[aria-label="Sounds management"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Duplicate"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Duplicate"]').trigger('click')
    await vi.waitFor(() => expect(project.sounds).toHaveLength(2))
    await wrapper.get('[aria-label="Sounds management"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Remove"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Remove"]').trigger('click')
    await vi.waitFor(() => expect(project.sounds.map((sound) => sound.name)).toEqual(['Beep']))
  })
})
