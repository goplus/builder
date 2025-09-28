import { describe, expect, it } from 'vitest'
import { fromText } from './common/file'
import { Project } from './project'
import { Sprite } from './sprite'
import { Costume } from './costume'
import { Sound } from './sound'
import { Animation } from './animation'

function mockFile(name = 'mocked') {
  return fromText(name, Math.random() + '')
}

function makeProject() {
  const project = new Project()
  const sprite = new Sprite('MySprite')
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

describe('Costume', () => {
  it('should clone correctly', () => {
    const project = makeProject()
    const sprite = project.sprites[0]
    const costume = sprite.costumes[0]

    const clone = costume.clone()
    expect(clone.id).not.toEqual(costume.id)
    expect(clone.name).toEqual(costume.name)
    expect(clone.img).toEqual(costume.img)
    expect(clone.pivot).toEqual(costume.pivot)
    expect(clone.faceRight).toEqual(costume.faceRight)
    expect(clone.bitmapResolution).toEqual(costume.bitmapResolution)

    sprite.addCostume(clone)
    expect(clone.parent).toEqual(sprite)
  })

  it('should add costume after correctly', () => {
    const project = makeProject()
    const sprite = project.sprites[0]
    const costume1 = sprite.costumes[0]
    const costume2 = new Costume('costume2', mockFile())
    const costume3 = new Costume('costume3', mockFile())
    const costume4 = new Costume('costume4', mockFile())
    sprite.addCostumeAfter(costume4, costume1.id)
    sprite.addCostumeAfter(costume3, costume4.id)
    sprite.addCostumeAfter(costume2, costume3.id)
    expect(sprite.costumes.map(({ name }) => name)).toEqual(['default', 'costume4', 'costume3', 'costume2'])
  })
})
