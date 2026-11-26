import { z } from 'zod'
import { ProjectType } from '@/apis/project'
import { fromConfig, fromText, toConfig, toText, type Files } from '../common/file'

export type CourseProjectContent =
  | { type: ProjectType.GuidedCourse; entrypoint: string; prompt: string }
  | { type: ProjectType.PlaygroundCourse; files: Files }

/** Playground keeps the complete authored file collection, including files unknown to the editor. */
export async function loadCourseProjectContent(
  type: CourseProjectContent['type'],
  files: Files
): Promise<CourseProjectContent> {
  if (type === ProjectType.PlaygroundCourse) return { type, files }
  const index = files['index.json']
  const promptFile = files['prompt.md']
  if (index == null || promptFile == null) throw new Error('Guided course requires index.json and prompt.md')
  const { entrypoint } = z.object({ entrypoint: z.string() }).parse(await toConfig(index))
  return { type, entrypoint, prompt: await toText(promptFile) }
}

export function exportCourseProjectFiles(content: CourseProjectContent): Files {
  if (content.type === ProjectType.PlaygroundCourse) return content.files
  return {
    'index.json': fromConfig('index.json', { entrypoint: content.entrypoint }),
    'prompt.md': fromText('prompt.md', content.prompt)
  }
}
