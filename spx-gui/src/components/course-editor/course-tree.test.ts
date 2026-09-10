import { describe, expect, it } from 'vitest'

import { fromConfig, fromText, type Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { TutorialProject } from '@/models/tutorial/project'
import {
  buildCourseTree,
  findNode,
  getChangedPaths,
  isNodeDirty,
  nearestExistingPath,
  resolveCourseDoc
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

function describeTree(nodes: ReturnType<typeof buildCourseTree>): unknown[] {
  return nodes.map((node) =>
    node.type === 'folder' ? [node.path, describeTree(node.children)] : `${node.type}:${node.path}`
  )
}

describe('buildCourseTree', () => {
  it('projects records into nodes: packages are opaque, unclaimed records are plain files', async () => {
    const tree = buildCourseTree(await loadProject())

    expect(describeTree(tree)).toEqual([
      [
        'assets',
        [
          ['assets/images', ['file:assets/images/hint.png']],
          ['assets/videos', ['video:assets/videos/step-to']]
        ]
      ],
      'project:project',
      `file:${mainCourseFilePath}`,
      'file:notes.md'
    ])
    const hint = findNode(tree, 'assets/images/hint.png')
    expect(hint?.type === 'file' && hint.kind).toBe('image')
    const notes = findNode(tree, 'notes.md')
    expect(notes?.type === 'file' && [notes.kind, notes.known]).toEqual(['text', false])
    const program = findNode(tree, mainCourseFilePath)
    expect(program?.type === 'file' && program.known).toBe(true)
  })

  it('always offers the videos folder', async () => {
    const files = makeFiles()
    delete files['assets/videos/step-to/index.json']
    delete files['assets/videos/step-to/step-to.mp4']
    const tree = buildCourseTree(await loadProject(files))

    expect(findNode(tree, 'assets/videos')?.type).toBe('folder')
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
    expect(doc.type === 'node' && doc.node.type).toBe('video')
    expect(resolveCourseDoc(tree, 'project', 'assets/videos')).toMatchObject({ type: 'node', node: { type: 'folder' } })
    expect(resolveCourseDoc(tree, 'project', 'nope.txt')).toEqual({ type: 'missing', path: 'nope.txt' })
  })

  it('falls back to the nearest existing ancestor', async () => {
    const tree = buildCourseTree(await loadProject())

    expect(nearestExistingPath(tree, 'assets/images')).toBe('assets/images')
    expect(nearestExistingPath(tree, 'assets/gone/deeper')).toBe('assets')
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
    expect(isNodeDirty(findNode(tree, 'assets')!, changed)).toBe(false)
    expect(isNodeDirty(findNode(tree, 'assets/videos/step-to')!, changed)).toBe(false)
  })
})
