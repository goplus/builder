import { shallowRef } from 'vue'
import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { Sound } from '@/models/spx/sound'
import { mockFile } from '@/models/common/test'
import { SoundsEditorState } from './sounds-editor-state'

function makeSounds(): Sound[] {
  return [new Sound('sound1', mockFile()), new Sound('sound2', mockFile()), new Sound('sound3', mockFile())]
}

describe('SoundsEditorState', () => {
  it('should auto-select first sound on initialization', () => {
    const sounds = makeSounds()
    const state = new SoundsEditorState(() => sounds)

    expect(state.selected).toBe(sounds[0])

    state.dispose()
  })

  it('should select sound by id correctly', () => {
    const sounds = makeSounds()
    const state = new SoundsEditorState(() => sounds)

    state.select(sounds[1].id)
    expect(state.selected).toBe(sounds[1])

    state.select(sounds[2].id)
    expect(state.selected).toBe(sounds[2])

    state.dispose()
  })

  it('should handle non-existent sound id gracefully', async () => {
    const sounds = makeSounds()
    const state = new SoundsEditorState(() => sounds)

    state.select('non-existent-id')
    await flushPromises()

    // Auto-selection logic should fall back to first sound
    expect(state.selected).toBe(sounds[0])

    state.dispose()
  })

  it('should select sound by name correctly', () => {
    const sounds = makeSounds()
    const state = new SoundsEditorState(() => sounds)

    state.selectByName('sound2')
    expect(state.selected).toBe(sounds[1])

    state.dispose()
  })

  it('should handle non-existent name gracefully', () => {
    const sounds = makeSounds()
    const state = new SoundsEditorState(() => sounds)

    state.selectByName('non-existent')
    // Should remain on previous selection since name not found
    expect(state.selected).toBe(sounds[0])

    state.dispose()
  })

  it('should handle empty sounds list', () => {
    const sounds: Sound[] = []
    const state = new SoundsEditorState(() => sounds)

    expect(state.selected).toBeNull()

    state.dispose()
  })

  it('should auto-select first sound when current selection is removed', async () => {
    const soundsRef = shallowRef(makeSounds())
    const state = new SoundsEditorState(() => soundsRef.value)

    state.select(soundsRef.value[1].id)
    expect(state.selected).toBe(soundsRef.value[1])

    // Simulate removal: remove sounds[1] from the array
    const remaining = [soundsRef.value[0], soundsRef.value[2]]
    soundsRef.value = remaining
    await flushPromises()

    expect(state.selected).toBe(remaining[0])

    state.dispose()
  })

  it('should auto-select newly added sound when list was empty', async () => {
    const soundsRef = shallowRef<Sound[]>([])
    const state = new SoundsEditorState(() => soundsRef.value)
    expect(state.selected).toBeNull()

    const newSound = new Sound('newSound', mockFile())
    soundsRef.value = [newSound]
    await flushPromises()

    expect(state.selected).toBe(newSound)

    state.dispose()
  })

  it('should produce correct route for selection', () => {
    const sounds = makeSounds()
    const state = new SoundsEditorState(() => sounds)

    state.select(sounds[1].id)
    expect(state.getRoute()).toEqual(['sound2'])

    state.dispose()
  })

  it('should select by route correctly', () => {
    const sounds = makeSounds()
    const state = new SoundsEditorState(() => sounds)

    state.selectByRoute(['sound3'])
    expect(state.selected).toBe(sounds[2])

    state.dispose()
  })

  it('should return empty route when nothing is selected', () => {
    const sounds: Sound[] = []
    const state = new SoundsEditorState(() => sounds)

    expect(state.getRoute()).toEqual([])

    state.dispose()
  })
})
