import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { delayFile } from '@/utils/test'
import { fromText, type Files } from './common/file'
import { Project } from './project'
import { Sprite } from './sprite'
import { Costume } from './costume'
import { Sound } from './sound'
import { Animation } from './animation'

vi.mock('@/apis/ai-description', () => ({
  generateAIDescription: vi.fn().mockResolvedValue('Mocked AI description for testing')
}))

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
    animation.setSound(project.sounds[0].id)
    expect(animation.sound).toBe(project.sounds[0].id)

    const sound2 = new Sound('sound2', mockFile())
    project.addSound(sound2)
    animation.setSound(sound2.id)
    expect(animation.sound).toBe(sound2.id)

    animation.setSound(null)
    expect(animation.sound).toBeNull()

    animation.setSound(project.sounds[0].id)
    expect(animation.sound).toBe(project.sounds[0].id)
  })

  it('should work well with sound renaming', async () => {
    const project = makeProject()
    const sprite = project.sprites[0]
    const animation = sprite.animations[0]
    animation.setSound(project.sounds[0].id)
    await nextTick()
    project.sounds[0].setName('newSound')
    await nextTick()
    const newSound = project.sounds.find((s) => s.id === animation.sound)
    expect(newSound?.name).toBe('newSound')
  })

  it('should work well with sound deletion', async () => {
    const project = makeProject()
    const sprite = project.sprites[0]
    const animation = sprite.animations[0]
    animation.setSound(project.sounds[0].id)
    await nextTick()
    project.removeSound(project.sounds[0].id)
    await nextTick()
    expect(animation.sound).toBeNull()
  })

  it('should work correctly while project loads', async () => {
    const project = makeProject()
    project.sprites[0].animations[0].setSound(project.sounds[0].id)

    const [metadata, files] = await project.export()
    const delayedFiles: Files = Object.fromEntries(
      Object.entries(files).map(([path, file]) => [path, delayFile(file!, 50)])
    )
    const newProject = new Project()
    await newProject.load(metadata, delayedFiles)
    expect(newProject.sprites[0].animations[0].sound).toBe(newProject.sounds[0].id)
  })

  it('should be able to keep the id upon export and import. if the id is not provided, it should be generated', async () => {
    const project = makeProject()
    const sprite = project.sprites[0]
    const animation = sprite.animations[0]
    const id = animation.id
    // id should be not null and not empty
    expect(id).not.toBeNull()

    const [metadata, files] = await project.export()
    const newProject = new Project()
    await newProject.load(metadata, files)
    const newSprite = newProject.sprites[0]
    const newAnimation = newSprite.animations[0]
    expect(newAnimation.id).toBe(id)
  })
  it('should not export id if includeId is false', async () => {
    const project = makeProject()
    const sprite = project.sprites[0]
    const animation = sprite.animations[0]
    const id = animation.id
    // id should be not null and not empty
    expect(id).not.toBeNull()

    const exportedId = animation.export('', {
      includeId: false,
      sounds: project.sounds
    })[0].builder_id
    expect(exportedId).toBeUndefined()
  })
  it('should clone well', async () => {
    const project = makeProject()
    const sprite = project.sprites[0]
    const animation = sprite.animations[0]
    const clonedAnimation = animation.clone()
    expect(clonedAnimation.id).not.toBe(animation.id)
    expect(clonedAnimation.name).toBe(animation.name)
    expect(clonedAnimation.duration).toBe(animation.duration)
    expect(clonedAnimation.sound).toBe(animation.sound)
    expect(clonedAnimation.costumes.length).toBe(animation.costumes.length)
    for (let i = 0; i < clonedAnimation.costumes.length; i++) {
      expect(clonedAnimation.costumes[i].id).not.toBe(animation.costumes[i].id)
      expect(clonedAnimation.costumes[i].name).toBe(animation.costumes[i].name)
      expect(clonedAnimation.costumes[i].img).toBe(animation.costumes[i].img)
      expect(clonedAnimation.costumes[i].x).toBe(animation.costumes[i].x)
      expect(clonedAnimation.costumes[i].y).toBe(animation.costumes[i].y)
      expect(clonedAnimation.costumes[i].faceRight).toBe(animation.costumes[i].faceRight)
      expect(clonedAnimation.costumes[i].bitmapResolution).toBe(animation.costumes[i].bitmapResolution)
    }
  })
})
