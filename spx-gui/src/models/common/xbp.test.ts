import { describe, it, expect, vi } from 'vitest'
import { Sprite } from '../sprite'
import { Animation } from '../animation'
import { Sound } from '../sound'
import { Costume } from '../costume'
import { fromText, toText } from './file'
import { Project } from '../project'
import { load, save } from './xbp'

vi.mock('@/apis/ai-description', () => ({
  generateAIDescription: vi.fn().mockResolvedValue('Mocked AI description for testing')
}))

function mockFile(name = 'mocked', type = 'text/plain') {
  return fromText(name, Math.random() + '', { type })
}

function makeProject(name?: string, screenshotTaker = async () => mockFile()) {
  const project = new Project(undefined, name)
  const sound = new Sound('sound', mockFile())
  project.addSound(sound)

  const sprite = new Sprite('MySprite')
  const costume = new Costume('default', mockFile())
  sprite.addCostume(costume)
  const animationCostumes = Array.from({ length: 3 }, (_, i) => new Costume(`a${i}`, mockFile()))
  const animation = Animation.create('default', animationCostumes)
  sprite.addAnimation(animation)
  project.addSprite(sprite)
  project.bindScreenshotTaker(screenshotTaker)
  return project
}

describe('save', () => {
  it('should get xbp file correctly', async () => {
    const project = makeProject('test')
    const [metadata, files] = await project.export()
    const projectFile = await save(metadata, files)
    expect(projectFile.name).toBe('test.xbp')
  })
})

describe('save & load', () => {
  it('should save & load project correctly', async () => {
    const project = makeProject('test')
    const [metadata, files] = await project.export()
    const projectFile = await save(metadata, files)
    const { metadata: loadedMetadata, files: loadedFiles } = await load(projectFile)
    const project2 = new Project(undefined, 'test2')
    await project2.load(loadedMetadata, loadedFiles)
    expect(project2.name).toBe('test2')
    expect(project2.sprites.length).toBe(1)
    expect(project2.sounds.length).toBe(1)
  })

  it('should save & load project with metadata correctly', async () => {
    const project = makeProject('test')
    project.setDescription('test description')
    project.setInstructions('test instructions')
    const [metadata, files] = await project.export()
    const projectFile = await save(metadata, files)
    const { metadata: loadedMetadata, files: loadedFiles } = await load(projectFile)
    const project2 = new Project(undefined, 'test2')
    await project2.load(loadedMetadata, loadedFiles)
    expect(project2.name).toBe('test2')
    expect(project2.description).toBe('test description')
    expect(project2.instructions).toBe('test instructions')
  })

  it('should save & load project with thumbnail correctly', async () => {
    const thumbnail = mockFile('thumbnail', 'image/jpeg')
    const project = makeProject('test', async () => thumbnail)
    await project['updateThumbnail']()
    const [metadata, files] = await project.export()
    const projectFile = await save(metadata, files)
    const { metadata: loadedMetadata, files: loadedFiles } = await load(projectFile)
    const project2 = new Project(undefined, 'test2')
    await project2.load(loadedMetadata, loadedFiles)

    expect(await toText(project2.thumbnail!)).toBe(await toText(thumbnail))
    expect(project2.thumbnail!.type).toBe('image/jpeg')
  })
})
