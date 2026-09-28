import type { ByPage } from './common'
import type { ListCoursesParams, PlaygroundCourse } from './course'
import type { CourseSeries } from './course-series'

import { createDefaultProject } from '@/components/project/default-project'
import { fromConfig, fromText, prefixFiles, type File, type Files } from '@/models/common/file'
import { Monitor } from '@/models/spx/widget/monitor'

export const playgroundDemoCourseSeriesID = 'playground-demo-series'

const playgroundDemoCourseIDs = ['playground-demo-course-1', 'playground-demo-course-2', 'playground-demo-course-3']

const playgroundDemoSeries: CourseSeries = {
  id: playgroundDemoCourseSeriesID,
  owner: 'tutorial-demo',
  kind: 'playground',
  title: 'Playground Demo Series',
  thumbnail: '',
  description: 'A temporary Course playground for Tutorial v2 development.',
  courseIDs: playgroundDemoCourseIDs,
  order: 1,
  createdAt: '2026-08-26T00:00:00Z',
  updatedAt: '2026-08-26T00:00:00Z'
}

type PlaygroundDemoData = {
  courses: PlaygroundCourse[]
}

let playgroundDemoDataPromise: Promise<PlaygroundDemoData> | null = null

async function createPlaygroundDemoData(): Promise<PlaygroundDemoData> {
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
    const courses: PlaygroundCourse[] = playgroundDemoCourseIDs.map((id, index) => ({
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

function getPlaygroundDemoData() {
  playgroundDemoDataPromise ??= createPlaygroundDemoData().catch((error) => {
    playgroundDemoDataPromise = null
    throw error
  })
  return playgroundDemoDataPromise
}

export function getPlaygroundDemoCourseSeries(id: string, signal?: AbortSignal): CourseSeries | null {
  signal?.throwIfAborted()
  if (id !== playgroundDemoCourseSeriesID) return null
  return { ...playgroundDemoSeries, courseIDs: [...playgroundDemoSeries.courseIDs] }
}

export async function getPlaygroundDemoCourse(id: string, signal?: AbortSignal): Promise<PlaygroundCourse | null> {
  if (!playgroundDemoCourseIDs.includes(id)) return null
  signal?.throwIfAborted()
  const { courses } = await getPlaygroundDemoData()
  signal?.throwIfAborted()
  return courses.find((course) => course.id === id) ?? null
}

export async function listPlaygroundDemoCourses(
  params: ListCoursesParams | undefined,
  signal?: AbortSignal
): Promise<ByPage<PlaygroundCourse> | null> {
  if (params?.courseSeriesID !== playgroundDemoCourseSeriesID) return null
  signal?.throwIfAborted()
  const { courses } = await getPlaygroundDemoData()
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
