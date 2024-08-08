import { describe, it, expect } from 'vitest'
import { Sprite } from '../sprite'
import { Animation } from '../animation'
import { Sound } from '../sound'
import { Costume } from '../costume'
import { fromText } from '../common/file'
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
})
