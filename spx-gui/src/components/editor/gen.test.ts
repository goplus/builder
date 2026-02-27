import { describe, it, expect } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { makeSpxProject } from '@/models/spx/common/test'
import { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { BackdropGen } from '@/models/spx/gen/backdrop-gen'
import { GenState } from './gen'

describe('GenState', () => {
  describe('addSprite', () => {
    it('should ensure sprite name is not empty', () => {
      const i18n = createI18n({ lang: 'en' })
      const project = makeSpxProject()
      const genState = new GenState(i18n, project)

      const spriteGen = new SpriteGen(i18n, project, {
        settings: { name: '' }
      })

      genState.addSprite(spriteGen)

      expect(spriteGen.settings.name).not.toBe('')
    })

    it('should ensure sprite name follows sprite name format', () => {
      const i18n = createI18n({ lang: 'en' })
      const project = makeSpxProject()
      const genState = new GenState(i18n, project)

      const spriteGen = new SpriteGen(i18n, project, {
        settings: { name: 'invalid-name-with-dashes' }
      })

      genState.addSprite(spriteGen)

      expect(spriteGen.settings.name).toMatch(/^[A-Z][a-zA-Z0-9]*$/)
    })

    it('should rename sprite if name conflicts with existing spriteGen', () => {
      const i18n = createI18n({ lang: 'en' })
      const project = makeSpxProject()
      const genState = new GenState(i18n, project)

      const spriteGen1 = new SpriteGen(i18n, project, {
        settings: { name: 'Knight' }
      })
      genState.addSprite(spriteGen1)

      const spriteGen2 = new SpriteGen(i18n, project, {
        settings: { name: 'Knight' }
      })
      genState.addSprite(spriteGen2)

      expect(spriteGen1.settings.name).toBe('Knight')
      expect(spriteGen2.settings.name).not.toBe('Knight')
      expect(spriteGen2.settings.name).toMatch(/^Knight\d+$/)
    })

    it('should handle multiple conflicting names correctly', () => {
      const i18n = createI18n({ lang: 'en' })
      const project = makeSpxProject()
      const genState = new GenState(i18n, project)

      const spriteGens = [
        new SpriteGen(i18n, project, { settings: { name: 'Hero' } }),
        new SpriteGen(i18n, project, { settings: { name: 'Hero' } }),
        new SpriteGen(i18n, project, { settings: { name: 'Hero' } })
      ]

      spriteGens.forEach((gen) => genState.addSprite(gen))

      expect(spriteGens[0].settings.name).toBe('Hero')
      expect(spriteGens[1].settings.name).toBe('Hero2')
      expect(spriteGens[2].settings.name).toBe('Hero3')
    })
  })

  describe('addBackdrop', () => {
    it('should ensure backdrop name is not empty', () => {
      const i18n = createI18n({ lang: 'en' })
      const project = makeSpxProject()
      const genState = new GenState(i18n, project)

      const backdropGen = new BackdropGen(project, {
        settings: { name: '' }
      })

      genState.addBackdrop(backdropGen)

      expect(backdropGen.settings.name).not.toBe('')
    })

    it('should rename backdrop if name conflicts with existing backdropGen', () => {
      const i18n = createI18n({ lang: 'en' })
      const project = makeSpxProject()
      const genState = new GenState(i18n, project)

      const backdropGen1 = new BackdropGen(project, {
        settings: { name: 'forest' }
      })
      genState.addBackdrop(backdropGen1)

      const backdropGen2 = new BackdropGen(project, {
        settings: { name: 'forest' }
      })
      genState.addBackdrop(backdropGen2)

      expect(backdropGen1.settings.name).toBe('forest')
      expect(backdropGen2.settings.name).not.toBe('forest')
      expect(backdropGen2.settings.name).toMatch(/^forest\d+$/)
    })

    it('should handle multiple conflicting backdrop names correctly', () => {
      const i18n = createI18n({ lang: 'en' })
      const project = makeSpxProject()
      const genState = new GenState(i18n, project)

      const backdropGens = [
        new BackdropGen(project, { settings: { name: 'castle' } }),
        new BackdropGen(project, { settings: { name: 'castle' } }),
        new BackdropGen(project, { settings: { name: 'castle' } })
      ]

      backdropGens.forEach((gen) => genState.addBackdrop(gen))

      expect(backdropGens[0].settings.name).toBe('castle')
      expect(backdropGens[1].settings.name).toBe('castle2')
      expect(backdropGens[2].settings.name).toBe('castle3')
    })
  })
})
