vi.mock('paper', () => ({}))
vi.mock('paperjs-offset', () => ({}))
import { ref, type WatchSource } from 'vue'
import { afterEach, beforeEach, describe, expect, vi, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { Project } from '@/models/project'
import { Sprite } from '@/models/sprite'
import { Sound } from '@/models/sound'
import { Backdrop } from '@/models/backdrop'
import { Monitor } from '@/models/widget/monitor'
import { Costume } from '@/models/costume'
import { Animation } from '@/models/animation'
import { fromText } from '@/models/common/file'
import type * as editing from './editing'

import { EditorState, type IRouter, type Selected } from './editor-state'

function mockFile(name = 'mocked') {
  return fromText(name, Math.random() + '')
}

function mockLocalStorage(): editing.LocalStorage {
  return {
    clear: vi.fn().mockResolvedValue(undefined)
  }
}

function createEmptyProject(): Project {
  const project = new Project()
  project.bindScreenshotTaker(async () => mockFile())
  return project
}

function createProjectWithResources(): Project {
  const project = new Project()

  // Add sounds
  const sound1 = new Sound('sound1', mockFile())
  const sound2 = new Sound('sound2', mockFile())
  project.addSound(sound1)
  project.addSound(sound2)

  // Add backdrop
  project.stage.addBackdrop(new Backdrop('backdrop1', mockFile()))
  project.stage.addBackdrop(new Backdrop('backdrop2', mockFile()))

  // Add widget
  project.stage.addWidget(
    new Monitor('monitor1', {
      x: 10,
      y: 20,
      label: 'Score',
      variableName: 'score'
    })
  )
  project.stage.addWidget(
    new Monitor('monitor2', {
      x: 30,
      y: 40,
      label: 'Health',
      variableName: 'health'
    })
  )

  // Add sprites with costumes and animations
  const sprite1 = new Sprite('sprite1')
  sprite1.addCostume(new Costume('costume1', mockFile()))
  sprite1.addCostume(new Costume('costume2', mockFile()))

  const animation1 = Animation.create('animation1', [
    new Costume('anim1', mockFile()),
    new Costume('anim2', mockFile())
  ])
  const animation2 = Animation.create('animation2', [
    new Costume('anim3', mockFile()),
    new Costume('anim4', mockFile())
  ])
  sprite1.addAnimation(animation1)
  sprite1.addAnimation(animation2)
  project.addSprite(sprite1)

  const sprite2 = new Sprite('sprite2')
  sprite2.addCostume(new Costume('costume3', mockFile()))
  sprite2.addCostume(new Costume('costume4', mockFile()))
  project.addSprite(sprite2)

  project.bindScreenshotTaker(async () => mockFile())
  return project
}

function mockRouter() {
  const currentRoute = ref({
    fullPath: '/',
    params: {},
    query: {},
    hash: ''
  })

  return {
    currentRoute,
    push: vi.fn().mockResolvedValue(undefined)
  } satisfies IRouter
}

function createEditorState(
  project: Project = createEmptyProject(),
  isOnline: WatchSource<boolean> = ref(true),
  signedInUsername: WatchSource<string | null> = ref('user'),
  localCacheKey: string = 'test-cache-key',
  localStorage: editing.LocalStorage = mockLocalStorage()
): EditorState {
  return new EditorState(project, isOnline, signedInUsername, localCacheKey, localStorage)
}

describe('EditorState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with empty project and default to sprite selection', async () => {
      const project = createEmptyProject()
      const editorState = createEditorState(project)

      await flushPromises()

      expect(editorState.selected.type).toBe('sprite')
      if (editorState.selected.type === 'sprite') {
        expect(editorState.selected.sprite).toBeNull()
      }
      expect(editorState.selectedSprite).toBeNull()
      expect(editorState.selectedSound).toBeNull()

      editorState.dispose()
    })

    it('should initialize with normal project and auto-select first sprite', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)

      await flushPromises()

      expect(editorState.selected.type).toBe('sprite')
      if (editorState.selected.type === 'sprite') {
        expect(editorState.selected.sprite).toBe(project.sprites[0])
      }
      expect(editorState.selectedSprite).toBe(project.sprites[0])
      expect(editorState.spriteState).not.toBeNull()

      editorState.dispose()
    })
  })

  describe('selection methods', () => {
    it('should select stage correctly', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)

      editorState.select({ type: 'stage' })
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'stage',
        stageSelected: {
          type: 'code'
        }
      } satisfies Selected)
      expect(editorState.selectedSprite).toBeNull()
      expect(editorState.selectedSound).toBeNull()

      editorState.dispose()
    })

    it('should select sprite by id correctly', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)
      const sprite = project.sprites[1] // sprite2

      editorState.select({ type: 'sprite', id: sprite.id })
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'sprite',
        sprite,
        spriteSelected: {
          type: 'code'
        }
      } satisfies Selected)
      expect(editorState.selectedSprite).toBe(sprite)
      expect(editorState.spriteState).not.toBeNull()

      editorState.dispose()
    })

    it('should select sound by id correctly', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)
      const sound = project.sounds[1] // sound2

      editorState.select({ type: 'sound', id: sound.id })
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'sound',
        sound
      } satisfies Selected)
      expect(editorState.selectedSound).toBe(sound)

      editorState.dispose()
    })

    it('should handle non-existent sprite id gracefully', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)

      editorState.select({ type: 'sprite', id: 'non-existent-id' })
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'sprite',
        sprite: project.sprites[0],
        spriteSelected: {
          type: 'code'
        }
      } satisfies Selected)
      // When selecting a non-existent sprite ID, the selectedSpriteIdRef is set but no sprite is found
      // The auto-selection logic will kick in and select the first sprite
      expect(editorState.selectedSprite).toBe(project.sprites[0])

      editorState.dispose()
    })

    it('should handle non-existent sound id gracefully', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)

      editorState.select({ type: 'sound', id: 'non-existent-id' })
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'sound',
        sound: project.sounds[0]
      } satisfies Selected)
      // When selecting a non-existent sound ID, the selectedSoundIdRef is set but no sound is found
      // The auto-selection logic will kick in and select the first sound
      expect(editorState.selectedSound).toBe(project.sounds[0])

      editorState.dispose()
    })

    it('should select correctly with undo/redo', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)

      editorState.selectCostume(project.sprites[0].id, project.sprites[0].costumes[0].id)
      await flushPromises()

      await project.history.doAction({ name: { en: 'test', zh: '测试' } }, () =>
        editorState.selectCostume(project.sprites[0].id, project.sprites[0].costumes[1].id)
      )
      await flushPromises()

      expect(editorState.selectedCostume?.name).toBe(project.sprites[0].costumes[1].name)

      await project.history.undo()
      await flushPromises()

      expect(editorState.selectedCostume?.name).toBe(project.sprites[0].costumes[0].name)

      await project.history.doAction({ name: { en: 'test', zh: '测试' } }, () =>
        editorState.selectCostume(project.sprites[0].id, project.sprites[0].costumes[1].id)
      )
      await flushPromises()

      expect(editorState.selectedCostume?.name).toBe(project.sprites[0].costumes[1].name)
    })
  })

  describe('selectByName methods', () => {
    it('should select sprite by name correctly', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)

      editorState.selectByName({ type: 'sprite', name: 'sprite2' })
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'sprite',
        sprite: project.sprites[1],
        spriteSelected: {
          type: 'code'
        }
      } satisfies Selected)
      expect(editorState.selectedSprite?.name).toBe('sprite2')

      editorState.dispose()
    })

    it('should select sound by name correctly', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)

      editorState.selectByName({ type: 'sound', name: 'sound2' })
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'sound',
        sound: project.sounds[1]
      } satisfies Selected)
      expect(editorState.selectedSound?.name).toBe('sound2')

      editorState.dispose()
    })

    it('should handle non-existent names gracefully', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)

      editorState.selectByName({ type: 'sprite', name: 'non-existent' })
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'sprite',
        sprite: project.sprites[0],
        spriteSelected: {
          type: 'code'
        }
      } satisfies Selected)
      // When selecting by a non-existent name, the select method is called with null ID
      // The auto-selection logic will kick in and select the first sprite
      expect(editorState.selectedSprite).toBe(project.sprites[0])

      editorState.dispose()
    })
  })

  describe('convenience selection methods', () => {
    it('should select sprite by id using selectSprite', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)
      const sprite = project.sprites[0]

      editorState.selectSprite(sprite.id)
      await flushPromises()

      expect(editorState.selectedSprite).toBe(sprite)

      editorState.dispose()
    })

    it('should select sound by id using selectSound', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)
      const sound = project.sounds[0]

      editorState.selectSound(sound.id)
      await flushPromises()

      expect(editorState.selectedSound).toBe(sound)

      editorState.dispose()
    })

    it('should select widget correctly', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)
      const widget = project.stage.widgets[0]

      editorState.selectWidget(widget.id)
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'stage',
        stageSelected: {
          type: 'widgets',
          widget
        }
      } satisfies Selected)

      editorState.dispose()
    })

    it('should select backdrop correctly', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)
      const backdrop = project.stage.backdrops[0]

      editorState.selectBackdrop(backdrop.id)
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'stage',
        stageSelected: {
          type: 'backdrops',
          backdrop
        }
      } satisfies Selected)

      editorState.dispose()
    })

    it('should select costume correctly', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)
      const sprite = project.sprites[0]
      const costume = sprite.costumes[1] // costume2

      editorState.selectCostume(sprite.id, costume.id)
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'sprite',
        sprite,
        spriteSelected: {
          type: 'costumes',
          costume
        }
      } satisfies Selected)
      expect(editorState.selectedSprite).toBe(sprite)
      expect(editorState.spriteState).not.toBeNull()

      editorState.dispose()
    })

    it('should select animation correctly', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)
      const sprite = project.sprites[0]
      const animation = sprite.animations[1]

      editorState.selectAnimation(sprite.id, animation.id)
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'sprite',
        sprite,
        spriteSelected: {
          type: 'animations',
          animation
        }
      } satisfies Selected)
      expect(editorState.selectedSprite).toBe(sprite)
      expect(editorState.spriteState).not.toBeNull()

      editorState.dispose()
    })
  })

  describe('selectResource method', () => {
    it('should select different resource types correctly', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)

      // Test sprite selection
      editorState.selectResource(project.sprites[1])
      expect(editorState.selectedSprite).toBe(project.sprites[1])

      // Test sound selection
      editorState.selectResource(project.sounds[1])
      expect(editorState.selectedSound).toBe(project.sounds[1])

      // Test stage selection
      editorState.selectResource(project.stage)
      expect(editorState.selected.type).toBe('stage')

      // Test backdrop selection (check that method was called)
      const selectBackdropSpy = vi.spyOn(editorState.stageState, 'selectBackdrop')
      editorState.selectResource(project.stage.backdrops[1])
      expect(selectBackdropSpy).toHaveBeenCalledWith(project.stage.backdrops[1].id)

      // Test widget selection (check that method was called)
      const selectWidgetSpy = vi.spyOn(editorState.stageState, 'selectWidget')
      editorState.selectResource(project.stage.widgets[1])
      expect(selectWidgetSpy).toHaveBeenCalledWith(project.stage.widgets[1].id)

      // Test costume selection
      const costume = project.sprites[1].costumes[1]
      editorState.selectResource(costume)
      expect(editorState.selected).toEqual({
        type: 'sprite',
        sprite: project.sprites[1],
        spriteSelected: {
          type: 'costumes',
          costume
        }
      } satisfies Selected)

      // Test animation selection
      const animation = project.sprites[0].animations[1]
      editorState.selectResource(animation)
      expect(editorState.selected).toEqual({
        type: 'sprite',
        sprite: project.sprites[0],
        spriteSelected: {
          type: 'animations',
          animation
        }
      } satisfies Selected)

      editorState.dispose()
    })
  })

  describe('router integration', () => {
    it('should sync selection to router correctly', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)
      const router = mockRouter()

      editorState.syncWithRouter(router)
      await flushPromises()

      // Select sprite and check router push
      editorState.selectSprite(project.sprites[1].id)
      await flushPromises()

      expect(router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            inEditorPath: ['sprites', 'sprite2', 'code']
          })
        })
      )

      editorState.dispose()
    })

    it('should sync from router to selection correctly', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)
      const router = mockRouter()

      editorState.syncWithRouter(router)
      await flushPromises()

      // Simulate router change
      router.currentRoute.value = {
        ...router.currentRoute.value,
        params: {
          inEditorPath: ['sounds', 'sound2']
        }
      }
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'sound',
        sound: project.sounds[1]
      } satisfies Selected)

      editorState.dispose()
    })

    it('should handle stage routes correctly', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)
      const router = mockRouter()

      editorState.syncWithRouter(router)
      await flushPromises()

      // Navigate to stage
      router.currentRoute.value = {
        ...router.currentRoute.value,
        params: {
          inEditorPath: ['stage']
        }
      }
      await flushPromises()

      expect(editorState.selected.type).toBe('stage')

      editorState.dispose()
    })

    it('should handle sprite sub-routes correctly', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)
      const router = mockRouter()

      editorState.syncWithRouter(router)
      await flushPromises()

      // Navigate to sprite with costume selection
      router.currentRoute.value = {
        ...router.currentRoute.value,
        params: {
          inEditorPath: ['sprites', 'sprite1', 'costumes', 'costume2']
        }
      }
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'sprite',
        sprite: project.sprites[0],
        spriteSelected: {
          type: 'costumes',
          costume: project.sprites[0].costumes[1]
        }
      } satisfies Selected)

      editorState.dispose()
    })

    it('should default to sprites route when no specific route provided', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)
      const router = mockRouter()

      editorState.syncWithRouter(router)
      await flushPromises()

      // Navigate with empty path (should default to sprites)
      router.currentRoute.value = {
        ...router.currentRoute.value,
        params: {
          inEditorPath: []
        }
      }
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'sprite',
        sprite: project.sprites[0],
        spriteSelected: {
          type: 'code'
        }
      } satisfies Selected)

      editorState.dispose()
    })

    it('should do replace instead of push when selected resource renamed', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)
      const router = mockRouter()

      editorState.syncWithRouter(router)
      await flushPromises()

      router.push.mockClear()
      // Simulate resource rename
      project.sprites[0].setName('newSpriteName')
      await flushPromises()

      expect(router.push).toHaveBeenCalledOnce()
      expect(router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            inEditorPath: ['sprites', 'newSpriteName', 'code']
          }),
          replace: true
        })
      )

      editorState.selectCostume(project.sprites[0].id, project.sprites[0].costumes[0].id)
      await flushPromises()

      router.push.mockClear()
      project.sprites[0].costumes[0].setName('newCostumeName')
      await flushPromises()

      expect(router.push).toHaveBeenCalledOnce()
      expect(router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            inEditorPath: ['sprites', 'newSpriteName', 'costumes', 'newCostumeName']
          }),
          replace: true
        })
      )

      editorState.dispose()
    })
  })

  describe('resource management', () => {
    it('should auto-select first sprite when current selection becomes invalid', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)

      // Select second sprite
      editorState.selectSprite(project.sprites[1].id)
      await flushPromises()
      expect(editorState.selectedSprite).toBe(project.sprites[1])

      // Remove the selected sprite
      project.removeSprite(project.sprites[1].id)
      await flushPromises()

      expect(editorState.selectedSprite).toBe(project.sprites[0])

      editorState.dispose()
    })

    it('should auto-select first sound when current selection becomes invalid', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)

      // Select second sound
      editorState.selectSound(project.sounds[1].id)
      await flushPromises()
      expect(editorState.selectedSound).toBe(project.sounds[1])

      // Remove the selected sound
      project.removeSound(project.sounds[1].id)
      await flushPromises()
      expect(editorState.selectedSound).toBe(project.sounds[0])

      editorState.dispose()
    })

    it('should handle project with no sprites gracefully', async () => {
      const project = createEmptyProject()
      const editorState = createEditorState(project)

      editorState.select({ type: 'sprite' })
      await flushPromises()

      expect(editorState.selected.type).toBe('sprite')
      expect(editorState.selectedSprite).toBeNull()
      expect(editorState.spriteState).toBeNull()

      editorState.dispose()
    })

    it('should handle project with no sounds gracefully', async () => {
      const project = createEmptyProject()
      const editorState = createEditorState(project)

      editorState.select({ type: 'sound' })
      await flushPromises()

      expect(editorState.selected.type).toBe('sound')
      expect(editorState.selectedSound).toBeNull()

      editorState.dispose()
    })

    it('should handle adding new sprites correctly', async () => {
      const project = createEmptyProject()
      const editorState = createEditorState(project)

      // Initially no sprite selected
      expect(editorState.selectedSprite).toBeNull()

      // Add a sprite
      const newSprite = new Sprite('newSprite')
      project.addSprite(newSprite)
      await flushPromises()

      expect(editorState.selectedSprite).toBe(newSprite)

      editorState.dispose()
    })

    it('should handle adding new sounds correctly', async () => {
      const project = createEmptyProject()
      const editorState = createEditorState(project)
      editorState.select({ type: 'sound' })

      // Initially no sound selected
      expect(editorState.selectedSound).toBeNull()

      // Add a sound
      const newSound = new Sound('newSound', mockFile())
      project.addSound(newSound)
      await flushPromises()

      expect(editorState.selectedSound).toBe(newSound)

      editorState.dispose()
    })

    it('should preserve in-sprite type selection when switching between sprites', async () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)

      editorState.selectSprite(project.sprites[0].id)
      editorState.spriteState!.select('costumes')
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'sprite',
        sprite: project.sprites[0],
        spriteSelected: {
          type: 'costumes',
          costume: project.sprites[0].costumes[0]
        }
      } satisfies Selected)

      editorState.selectSprite(project.sprites[1].id)
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'sprite',
        sprite: project.sprites[1],
        spriteSelected: {
          type: 'costumes',
          costume: project.sprites[1].costumes[0]
        }
      } satisfies Selected)

      editorState.spriteState!.select('code')
      editorState.selectSprite(project.sprites[0].id)
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'sprite',
        sprite: project.sprites[0],
        spriteSelected: {
          type: 'code'
        }
      } satisfies Selected)

      editorState.spriteState!.select('animations')
      editorState.selectSprite(project.sprites[1].id)
      await flushPromises()

      expect(editorState.selected).toEqual({
        type: 'sprite',
        sprite: project.sprites[1],
        spriteSelected: {
          type: 'animations',
          animation: null // No animations in `sprite[1]`, should default to null
        }
      } satisfies Selected)

      editorState.dispose()
    })
  })

  describe('error handling', () => {
    it('should throw error for invalid target type in select', () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)

      expect(() => {
        editorState.select({ type: 'invalid' } as any)
      }).toThrow('Unknown target type: invalid')

      editorState.dispose()
    })

    it('should throw error for invalid target type in selectByName', () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)

      expect(() => {
        editorState.selectByName({ type: 'invalid' } as any)
      }).toThrow('Unknown target type: invalid')

      editorState.dispose()
    })

    it('should throw error when trying to select costume without sprite state', async () => {
      const project = createEmptyProject() // Project with no sprites
      const editorState = createEditorState(project)

      expect(() => {
        editorState.selectCostume('non-existent-sprite-id', 'costume-id')
      }).toThrow('Sprite state expected')

      editorState.dispose()
    })

    it('should throw error when trying to select animation without sprite state', async () => {
      const project = createEmptyProject() // Project with no sprites
      const editorState = createEditorState(project)

      expect(() => {
        editorState.selectAnimation('non-existent-sprite-id', 'animation-id')
      }).toThrow('Sprite state expected')

      editorState.dispose()
    })
  })

  describe('disposal', () => {
    it('should dispose all resources correctly', () => {
      const project = createProjectWithResources()
      const editorState = createEditorState(project)
      editorState.selectAnimation(project.sprites[0].id, project.sprites[0].animations[0].id)

      // Ensure runtime and editing are created
      expect(editorState.runtime).toBeDefined()
      expect(editorState.editing).toBeDefined()

      // Mock dispose methods to verify they're called
      const runtimeDispose = vi.spyOn(editorState.runtime, 'dispose')
      const editingDispose = vi.spyOn(editorState.editing, 'dispose')
      const stageStateDispose = vi.spyOn(editorState.stageState, 'dispose')
      const spriteStateDispose = vi.spyOn(editorState.spriteState!, 'dispose')
      const animationsStateDispose = vi.spyOn(editorState.spriteState!.animationsState, 'dispose')

      editorState.dispose()

      expect(runtimeDispose).toHaveBeenCalled()
      expect(editingDispose).toHaveBeenCalled()
      expect(stageStateDispose).toHaveBeenCalled()
      expect(spriteStateDispose).toHaveBeenCalled()
      expect(animationsStateDispose).toHaveBeenCalled()
    })
  })
})
