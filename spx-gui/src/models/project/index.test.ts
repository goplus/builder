import { describe, it, expect } from 'vitest'
import { Sprite } from '../sprite'
import { Animation } from '../animation'
import { Sound } from '../sound'
import { Costume } from '../costume'
import { fromText, type Files } from '../common/file'
import { Project } from '.'

function mockFile(name = 'mocked') {
  return fromText(name, Math.random() + '')
}

function makeProject() {
  const project = new Project()
  const sprite = new Sprite('Sprite')
  const costume = new Costume('default', mockFile())
  sprite.addCostume(costume)
  const animationCostumes = Array.from({ length: 3 }, (_, i) => new Costume(`a${i}`, mockFile()))
  const animation = Animation.create('default', animationCostumes)
  sprite.addAnimation(animation)
  const sound = new Sound('sound', mockFile())
  project.addSprite(sprite)
  project.addSound(sound)
  return project
}

describe('Project', () => {
  it('should preserve animation sound with exportGameFiles & loadGameFiles', async () => {
    const project = makeProject()
    const sprite = project.sprites[0]
    const animation = sprite.animations[0]
    animation.setSound(project.sounds[0].name)

    const files = project.exportGameFiles()
    await project.loadGameFiles(files)
    expect(project.sprites[0].animations[0].sound).toBe(project.sounds[0].name)
  })

  it('should preserve order for sprites & sounds however files are sorted', async () => {
    const project = makeProject()

    project.sprites[0].setName('Sprite1')
    const sprite3 = new Sprite('Sprite3')
    project.addSprite(sprite3)
    const sprite2 = new Sprite('Sprite2')
    project.addSprite(sprite2)

    project.sounds[0].setName('sound1')
    const sound3 = new Sound('sound3', mockFile())
    project.addSound(sound3)
    const sound2 = new Sound('sound2', mockFile())
    project.addSound(sound2)

    const files = project.exportGameFiles()

    const reversedFiles = Object.keys(files)
      .reverse()
      .reduce<Files>((acc, key) => {
        acc[key] = files[key]
        return acc
      }, {})
    await project.loadGameFiles(reversedFiles)
    expect(project.sprites.map((s) => s.name)).toEqual(['Sprite1', 'Sprite3', 'Sprite2'])
    expect(project.sounds.map((s) => s.name)).toEqual(['sound1', 'sound3', 'sound2'])

    const shuffledFiles = Object.keys(files)
      .sort(() => Math.random() - 0.5)
      .reduce<Files>((acc, key) => {
        acc[key] = files[key]
        return acc
      }, {})
    await project.loadGameFiles(shuffledFiles)
    expect(project.sprites.map((s) => s.name)).toEqual(['Sprite1', 'Sprite3', 'Sprite2'])
    expect(project.sounds.map((s) => s.name)).toEqual(['sound1', 'sound3', 'sound2'])
  })
})
