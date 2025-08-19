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
    expect(clone.x).toEqual(costume.x)
    expect(clone.y).toEqual(costume.y)
    expect(clone.faceRight).toEqual(costume.faceRight)
    expect(clone.bitmapResolution).toEqual(costume.bitmapResolution)

    sprite.addCostume(clone)
    expect(clone.parent).toEqual(sprite)
  })
})
