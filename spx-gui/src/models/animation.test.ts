import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { delayFile } from '@/utils/test'
import { fromText, type Files } from './common/file'
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

describe('Animation', () => {
  it('should work well', () => {
    const project = makeProject()
    const sprite = project.sprites[0]
    const animation = sprite.animations[0]
    expect(animation.name).toBe('default')
    expect(animation.costumes.length).toBe(3)
    expect(animation.duration).toBe(3 / 10)
    expect(animation.sound).toBeNull()

    animation.setDuration(1)
    expect(animation.duration).toBe(1)
  })

  it('should work well with sound', () => {
    const project = makeProject()
    const sprite = project.sprites[0]
    const animation = sprite.animations[0]
    animation.setSound(project.sounds[0].name)
    expect(animation.sound).toBe(project.sounds[0].name)

    const sound2 = new Sound('sound2', mockFile())
    project.addSound(sound2)
    animation.setSound(sound2.name)
    expect(animation.sound).toBe(sound2.name)

    animation.setSound(null)
    expect(animation.sound).toBeNull()

    animation.setSound(project.sounds[0].name)
    expect(animation.sound).toBe(project.sounds[0].name)
  })

  it('should work well with sound renaming', async () => {
    const project = makeProject()
    const sprite = project.sprites[0]
    const animation = sprite.animations[0]
    animation.setSound(project.sounds[0].name)
    await nextTick()
    project.sounds[0].setName('newSound')
    await nextTick()
    expect(animation.sound).toBe('newSound')
  })

  it('should work well with sound deletion', async () => {
    const project = makeProject()
    const sprite = project.sprites[0]
    const animation = sprite.animations[0]
    animation.setSound(project.sounds[0].name)
    await nextTick()
    project.removeSound(project.sounds[0].name)
    await nextTick()
    expect(animation.sound).toBeNull()
  })

  it('should work correctly while project loads', async () => {
    const project = makeProject()
    project.sprites[0].animations[0].setSound(project.sounds[0].name)

    const [metadata, files] = await project.export()
    const delayedFiles: Files = Object.fromEntries(
      Object.entries(files).map(([path, file]) => [path, delayFile(file!, 50)])
    )
    const newProject = new Project()
    await newProject.load(metadata, delayedFiles)
    expect(newProject.sprites[0].animations[0].sound).toBe(newProject.sounds[0].name)
  })
})
