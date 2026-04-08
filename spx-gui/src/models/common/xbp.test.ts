import { describe, it, expect, vi } from 'vitest'
import { DefaultException } from '@/utils/exception'
import { Sprite } from '../spx/sprite'
import { Animation } from '../spx/animation'
import { Sound } from '../spx/sound'
import { Costume } from '../spx/costume'
import { fromText, toText } from './file'
import { SpxProject } from '../spx/project'
import { ProjectType } from '@/apis/project'
import { load, save } from './xbp'
import { unzip, zip } from '@/utils/zip'

vi.mock('@/apis/ai-description', () => ({
  generateAIDescription: vi.fn().mockResolvedValue('Mocked AI description for testing')
}))

function mockFile(name = 'mocked', type = 'text/plain') {
  return fromText(name, Math.random() + '', { type })
}

function makeProject(name?: string, screenshotTaker = async () => mockFile()) {
  const project = new SpxProject(undefined, name)
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

async function rewriteBuilderMetadata(
  projectFile: File,
  rewrite: (metadata: Record<string, unknown>) => Record<string, unknown>
) {
  const arrayBuffer = await projectFile.arrayBuffer()
  const unzipped = await unzip(new Uint8Array(arrayBuffer))
  const metadataFileName = 'builder-meta.json'
  const metadataBytes = unzipped[metadataFileName]
  expect(metadataBytes).toBeDefined()
  const metadata = JSON.parse(new TextDecoder().decode(metadataBytes)) as Record<string, unknown>
  unzipped[metadataFileName] = new TextEncoder().encode(JSON.stringify(rewrite(metadata)))
  const zipped = await zip(unzipped)
  return new File([zipped], projectFile.name, { type: projectFile.type })
}

describe('save', () => {
  it('should get xbp file correctly', async () => {
    const project = makeProject('test')
    const { metadata, files } = await project.export()
    const projectFile = await save(metadata, files)
    expect(projectFile.name).toBe('test.xbp')
  })
})

describe('save & load', () => {
  it('should save & load project correctly', async () => {
    const project = makeProject('test')
    const { metadata, files } = await project.export()
    const projectFile = await save(metadata, files)
    const loaded = await load(projectFile)
    const project2 = new SpxProject(undefined, 'test2')
    await project2.load(loaded)
    expect(project2.name).toBe('test2')
    expect(project2.sprites.length).toBe(1)
    expect(project2.sounds.length).toBe(1)
  })

  it('should save & load project with metadata correctly', async () => {
    const project = makeProject('test')
    project.setDisplayName('Test Project')
    project.setDescription('test description')
    project.setInstructions('test instructions')
    const { metadata, files } = await project.export()
    const projectFile = await save(metadata, files)
    const loaded = await load(projectFile)
    const project2 = new SpxProject(undefined, 'test2')
    await project2.load(loaded)
    expect(project2.name).toBe('test2')
    expect(project2.type).toBe(ProjectType.Game)
    expect(project2.displayName).toBe('Test Project')
    expect(project2.description).toBe('test description')
    expect(project2.instructions).toBe('test instructions')
  })

  it('should default missing metadata type to game when loading', async () => {
    const project = makeProject('test')
    const { metadata, files } = await project.export()
    const projectFile = await save(metadata, files)
    const legacyProjectFile = await rewriteBuilderMetadata(projectFile, (builderMetadata) => {
      const { type: _type, ...rest } = builderMetadata
      return rest
    })

    const loaded = await load(legacyProjectFile)
    const project2 = new SpxProject(undefined, 'test2')
    await project2.load(loaded)

    expect(project2.type).toBe(ProjectType.Game)
  })

  it('should reject unsupported metadata type when loading', async () => {
    const project = makeProject('test')
    const { metadata, files } = await project.export()
    const projectFile = await save(metadata, files)
    const invalidProjectFile = await rewriteBuilderMetadata(projectFile, (builderMetadata) => ({
      ...builderMetadata,
      type: 'unknown'
    }))

    await expect(load(invalidProjectFile)).rejects.toBeInstanceOf(DefaultException)
    await expect(load(invalidProjectFile)).rejects.toMatchObject({
      userMessage: {
        en: 'The project type "unknown" is not supported.',
        zh: '该项目类型暂不支持：unknown。'
      }
    })
  })

  it('should save & load project with thumbnail correctly', async () => {
    const thumbnail = mockFile('thumbnail', 'image/jpeg')
    const project = makeProject('test', async () => thumbnail)
    await project['updateThumbnail']()
    const { metadata, files } = await project.export()
    const projectFile = await save(metadata, files)
    const loaded = await load(projectFile)
    const project2 = new SpxProject(undefined, 'test2')
    await project2.load(loaded)

    expect(await toText(project2.thumbnail!)).toBe(await toText(thumbnail))
    expect(project2.thumbnail!.type).toBe('image/jpeg')
  })
})
