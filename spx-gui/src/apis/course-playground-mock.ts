import type { ByPage } from './common'
import type { ListCoursesParams, PlaygroundCourse } from './course'
import type { CourseSeries } from './course-series'

import { createDefaultProject } from '@/components/project/default-project'
import { fromConfig, fromText, prefixFiles, type File, type Files } from '@/models/common/file'
import { Monitor } from '@/models/spx/widget/monitor'
import { timeout } from '@/utils/utils'

export const playgroundMockCourseSeriesID = 'playground-demo-series'
const mockResponseDelay = 300

const playgroundMockCourseIDs = ['playground-demo-course-1', 'playground-demo-course-2', 'playground-demo-course-3']

const playgroundMockSeries: CourseSeries = {
  id: playgroundMockCourseSeriesID,
  owner: 'tutorial-demo',
  kind: 'playground',
  title: 'Playground Demo Series',
  thumbnail: '',
  description: 'A temporary Course playground for Tutorial v2 development.',
  courseIDs: playgroundMockCourseIDs,
  order: 1,
  createdAt: '2026-08-26T00:00:00Z',
  updatedAt: '2026-08-26T00:00:00Z'
}

type PlaygroundMockData = {
  courses: PlaygroundCourse[]
}

let playgroundMockDataPromise: Promise<PlaygroundMockData> | null = null

async function createPlaygroundMockData(): Promise<PlaygroundMockData> {
  const project = await createDefaultProject('', '', [])
  try {
    const secondSprite = project.sprites[0]?.clone()
    if (secondSprite == null) throw new Error('default sprite not found')
    secondSprite.setX(-120)
    secondSprite.setY(80)
    project.addSprite(secondSprite)
    project.stage.addWidget(
      new Monitor('Score', { x: -220, y: 150, visible: true, label: 'Score', variableName: 'score' })
    )
    const files: Files = {
      'index.json': fromConfig('index.json', {
        project: { type: 'spx', root: 'project' },
        inEditorPath: '/simple',
        copilotContext: 'Help the learner explore the Playground Course.'
      }),
      'main_course.gox': fromText(
        'main_course.gox',
        `onStart => {
	// TODO: Use an XGo List literal when the tutorial runtime supports it.
	apis := make([]string, 0)
	apis = append(apis, "xgo:github.com/goplus/spx/v3?Sprite.stepTo#0")
	apis = append(apis, "xgo:github.com/goplus/spx/v3?Sprite.turn#0")
	Editor.CodeEditor.filterAPIs apis
	Editor.Ruler.enable
	// showMessage "Hi, this is a sample course."
}

Copilot.onRoundComplete round => {
	if round.UserMessage == "结束" {
		conclusion := Copilot.generateText("Generate a short conclusion for the learning process (including user conversation with Copilot). Less than 50 words. Use the same language as the current UI language.")
		completeWith conclusion
	}
}`
      ),
      ...prefixFiles(project.exportFiles(), 'project')
    }
    const content = await toFileCollection(files)
    const courses: PlaygroundCourse[] = playgroundMockCourseIDs.map((id, index) => ({
      id,
      owner: 'tutorial-demo',
      kind: 'playground',
      title: `Playground Demo ${index + 1}`,
      thumbnail: '',
      content
    }))
    return { courses }
  } finally {
    project.dispose()
  }
}

function getPlaygroundMockData() {
  playgroundMockDataPromise ??= createPlaygroundMockData().catch((error) => {
    playgroundMockDataPromise = null
    throw error
  })
  return playgroundMockDataPromise
}

export async function getPlaygroundMockCourseSeries(id: string, signal?: AbortSignal): Promise<CourseSeries | null> {
  if (id !== playgroundMockCourseSeriesID) return null
  await timeout(mockResponseDelay, signal)
  signal?.throwIfAborted()
  return { ...playgroundMockSeries, courseIDs: [...playgroundMockSeries.courseIDs] }
}

export async function getPlaygroundMockCourse(id: string, signal?: AbortSignal): Promise<PlaygroundCourse | null> {
  if (!playgroundMockCourseIDs.includes(id)) return null
  signal?.throwIfAborted()
  const [{ courses }] = await Promise.all([getPlaygroundMockData(), timeout(mockResponseDelay, signal)])
  signal?.throwIfAborted()
  return courses.find((course) => course.id === id) ?? null
}

export async function listPlaygroundMockCourses(
  params: ListCoursesParams | undefined,
  signal?: AbortSignal
): Promise<ByPage<PlaygroundCourse> | null> {
  if (params?.courseSeriesID !== playgroundMockCourseSeriesID) return null
  signal?.throwIfAborted()
  const [{ courses }] = await Promise.all([getPlaygroundMockData(), timeout(mockResponseDelay, signal)])
  signal?.throwIfAborted()
  const resolvedPageIndex = params.pageIndex ?? 1
  const resolvedPageSize = params.pageSize ?? courses.length
  const start = (resolvedPageIndex - 1) * resolvedPageSize
  return { total: courses.length, data: courses.slice(start, start + resolvedPageSize) }
}

async function toFileCollection(files: Files) {
  return Object.fromEntries(
    await Promise.all(Object.entries(files).map(async ([path, file]) => [path, await toDataUrl(file!)] as const))
  )
}

async function toDataUrl(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let content = ''
  for (const byte of bytes) content += String.fromCharCode(byte)
  return `data:${file.type};base64,${btoa(content)}`
}
