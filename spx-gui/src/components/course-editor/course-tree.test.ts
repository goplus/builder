import { describe, expect, it } from 'vitest'

import { fromConfig, fromText, type Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { TutorialProject } from '@/models/tutorial/project'
import {
  buildCourseTree,
  findNode,
  getChangedPaths,
  getNodeKey,
  getNodeLabel,
  isNodeDirty,
  nearestExistingPath,
  resolveCourseDoc,
  type CourseNode
} from './course-tree'

function makeFiles(): Files {
  return {
    'index.json': fromConfig('index.json', {
      project: { type: 'spx', root: 'project' },
      inEditorPath: '',
      copilotContext: ''
    }),
    [mainCourseFilePath]: fromText(mainCourseFilePath, 'onStart => {}'),
    'project/assets/index.json': fromConfig('index.json', {}),
    'assets/videos/step-to/index.json': fromConfig('index.json', { path: 'step-to.mp4', builder_id: 'video-id' }),
    'assets/videos/step-to/step-to.mp4': fromText('step-to.mp4', 'video'),
    'notes.md': fromText('notes.md', '# notes'),
    'assets/images/hint.png': fromText('hint.png', 'png')
  }
}

async function loadProject(files = makeFiles()) {
  const project = new TutorialProject()
  await project.loadFiles(files)
  return project
}

function describeTree(nodes: CourseNode[]): unknown[] {
  return nodes.map((node) => {
    if (node.type === 'folder' || node.type === 'group') return [getNodeKey(node), describeTree(node.children)]
    return `${node.type}:${node.path}`
  })
}

describe('buildCourseTree', () => {
  it('projects the course as its parts, not as its directories', async () => {
    const tree = buildCourseTree(await loadProject())

    expect(describeTree(tree)).toEqual([
      `file:${mainCourseFilePath}`,
      ['assets/videos', ['resource:assets/videos/step-to']],
      ['assets/images', []],
      'project:project',
      ['group:unused', ['file:assets/images/hint.png', 'file:notes.md']]
    ])
    const hint = findNode(tree, 'assets/images/hint.png')
    expect(hint?.type === 'file' && hint.kind).toBe('image')
    const notes = findNode(tree, 'notes.md')
    expect(notes?.type === 'file' && [notes.kind, notes.known]).toEqual(['text', false])
    const program = findNode(tree, mainCourseFilePath)
    expect(program?.type === 'file' && program.known).toBe(true)
  })

  it('always offers the videos and pictures groups, and leaves out the unused heading when there is none', async () => {
    const files = makeFiles()
    delete files['assets/videos/step-to/index.json']
    delete files['assets/videos/step-to/step-to.mp4']
    delete files['assets/images/hint.png']
    delete files['notes.md']
    const tree = buildCourseTree(await loadProject(files))

    expect(describeTree(tree)).toEqual([
      `file:${mainCourseFilePath}`,
      ['assets/videos', []],
      ['assets/images', []],
      'project:project'
    ])
  })

  it('keeps a kind the course brought along', async () => {
    const files = makeFiles()
    files['assets/sounds/beep/index.json'] = fromConfig('index.json', { path: 'beep.wav', builder_id: 'sound-id' })
    files['assets/sounds/beep/beep.wav'] = fromText('beep.wav', 'sound')
    const tree = buildCourseTree(await loadProject(files))

    expect(describeTree(tree)).toContainEqual(['assets/sounds', ['resource:assets/sounds/beep']])
  })
})

describe('getNodeLabel', () => {
  it('names a node by what it is, and an unused record by where it is', async () => {
    const tree = buildCourseTree(await loadProject())
    const labelOf = (path: string) => getNodeLabel(findNode(tree, path)!)

    expect(labelOf(mainCourseFilePath)).toEqual({ en: 'Course program', zh: '课程程序' })
    expect(labelOf('assets/videos')).toEqual({ en: 'Videos', zh: '视频' })
    expect(labelOf('assets/images')).toEqual({ en: 'Pictures', zh: '图片' })
    expect(labelOf('assets/videos/step-to')).toEqual({ en: 'step-to', zh: 'step-to' })
    expect(labelOf('project')).toEqual({ en: 'Project', zh: '工程' })
    // A record the course does not use has nothing to be named after but its path.
    expect(labelOf('notes.md')).toEqual({ en: 'notes.md', zh: 'notes.md' })
    const group = tree.find((node) => node.type === 'group')!
    expect(getNodeLabel(group).zh).toBe('课程不使用的文件')
  })
})

describe('resolveCourseDoc', () => {
  it('maps paths to the root, the project, a node or nothing', async () => {
    const tree = buildCourseTree(await loadProject())

    expect(resolveCourseDoc(tree, 'project', '')).toEqual({ type: 'root' })
    expect(resolveCourseDoc(tree, 'project', 'project')).toEqual({ type: 'project', inEditorPath: [] })
    expect(resolveCourseDoc(tree, 'project', 'project/sprites/Lita')).toEqual({
      type: 'project',
      inEditorPath: ['sprites', 'Lita']
    })
    const doc = resolveCourseDoc(tree, 'project', 'assets/videos/step-to')
    expect(doc.type === 'node' && doc.node.type).toBe('resource')
    expect(resolveCourseDoc(tree, 'project', 'assets/videos')).toMatchObject({ type: 'node', node: { type: 'folder' } })
    // A record the course does not use is still addressable, wherever it sits.
    expect(resolveCourseDoc(tree, 'project', 'assets/images/hint.png')).toMatchObject({
      type: 'node',
      node: { type: 'file' }
    })
    // `assets` is an export detail, not a node of the tree any more.
    expect(resolveCourseDoc(tree, 'project', 'assets')).toEqual({ type: 'missing', path: 'assets' })
    expect(resolveCourseDoc(tree, 'project', 'nope.txt')).toEqual({ type: 'missing', path: 'nope.txt' })
  })

  it('falls back to the nearest existing ancestor', async () => {
    const tree = buildCourseTree(await loadProject())

    expect(nearestExistingPath(tree, 'assets/videos')).toBe('assets/videos')
    expect(nearestExistingPath(tree, 'assets/videos/gone')).toBe('assets/videos')
    expect(nearestExistingPath(tree, 'assets/gone/deeper')).toBe('')
    expect(nearestExistingPath(tree, 'gone.txt')).toBe('')
  })
})

describe('dirty tracking', () => {
  it('marks the nodes whose records changed since the baseline', async () => {
    const project = await loadProject()
    const tree = buildCourseTree(project)
    const baseline = project.exportFiles()

    expect(getChangedPaths(baseline, project.exportFiles()).size).toBe(0)

    project.mainCourse.setCode('onStart => { showVideo "step-to" }')
    project.setConfig({ copilotContext: 'Changed.' })
    project.removeExtraFile('notes.md')
    const changed = getChangedPaths(baseline, project.exportFiles())

    expect([...changed].sort()).toEqual(['index.json', mainCourseFilePath, 'notes.md'])
    expect(isNodeDirty({ type: 'root' }, changed)).toBe(true)
    expect(isNodeDirty(findNode(tree, mainCourseFilePath)!, changed)).toBe(true)
    expect(isNodeDirty(findNode(tree, 'assets/videos')!, changed)).toBe(false)
    expect(isNodeDirty(findNode(tree, 'assets/videos/step-to')!, changed)).toBe(false)
    // The heading has no path of its own, so it takes its mark from the records it collects.
    const group = tree.find((node) => node.type === 'group')!
    expect(isNodeDirty(group, changed)).toBe(true)
  })
})
