import { describe, expect, it } from 'vitest'
import { ProjectType } from '@/apis/project'
import { fromText, toConfig, toText } from '../common/file'
import { xbpHelpers } from '../common/xbp'
import { SpxProject } from '../spx/project'
import { exportCourseProjectFiles, loadCourseProjectContent } from './course-project'

describe('course project files', () => {
  it('keeps the Guided sample address and prompt in separate root files', async () => {
    const type = ProjectType.GuidedCourse
    const entrypoint = '/editor/curator/Lita-Course-31/sprites/Lita/code'
    const prompt = '# 任务\n\nRun the sample.\n'
    const files = exportCourseProjectFiles({ type, entrypoint, prompt })
    const xbp = await xbpHelpers.save({ metadata: { type, displayName: '程序的开关' }, files })
    const loaded = await xbpHelpers.load(xbp)
    expect(loaded.metadata).toMatchObject({ type, displayName: '程序的开关' })
    expect(Object.keys(loaded.files).sort()).toEqual(['index.json', 'prompt.md'])
    expect(await toConfig(loaded.files['index.json']!)).toEqual({ entrypoint })
    expect(await loadCourseProjectContent(type, loaded.files)).toEqual({ type, entrypoint, prompt })
  })

  it('passes the complete Playground file collection through XBP', async () => {
    const type = ProjectType.PlaygroundCourse
    const files = {
      'index.json': fromText('index.json', JSON.stringify({ project: { type: 'spx', root: 'exercise' } })),
      'main_course.gox': fromText('main_course.gox', 'playVideo "story"'),
      'exercise/main.spx': fromText('main.spx', 'println "Hello"'),
      'builder-ai-description.md': fromText('builder-ai-description.md', 'Course-local notes')
    }
    const content = await loadCourseProjectContent(type, files)
    expect(exportCourseProjectFiles(content)).toBe(files)
    const loaded = await xbpHelpers.load(await xbpHelpers.save({ metadata: { type }, files }))
    expect(loaded.metadata.type).toBe(type)
    expect(Object.keys(loaded.files).sort()).toEqual(Object.keys(files).sort())
    for (const [path, file] of Object.entries(files)) expect(await toText(loaded.files[path]!)).toBe(await toText(file))
  })

  it('rejects a course before importing its metadata into a game', async () => {
    const project = new SpxProject()
    await expect(project.load({ metadata: { type: ProjectType.GuidedCourse }, files: {} })).rejects.toThrow()
    expect(project.type).toBe(ProjectType.Game)
  })
})
