import type { ByPage } from './common'
import type { ListCoursesParams, PlaygroundCourse } from './course'
import type { CourseSeries } from './course-series'

import { createDefaultProject } from '@/components/project/default-project'
import { fromConfig, fromText, prefixFiles, type File, type Files } from '@/models/common/file'
import { timeout } from '@/utils/utils'

// TODO: Remove this temporary mock and its API hooks before merging the collaboration branch into dev/main.
export const playgroundMockCourseSeriesID = 'playground-demo-series'
const mockResponseDelay = 300

const playgroundMockCourses = [
  {
    id: 'playground-demo-course-1',
    title: '1. Message and completion',
    code: `onStart => {
\tshowMessage "**Welcome!** Click Continue to complete this minimal course."
\tcomplete
}`
  },
  {
    id: 'playground-demo-course-2',
    title: '2. Prelude, video and Markdown',
    code: `onStart => {
\tshowPrelude "# Watch the opening video\\n\\n- Try the sound toggle.\\n- Replay after the video ends.\\n- Click Continue when finished."
\tshowVideo "opening"
\tshowMessage "## Video finished\\n\\nThe course advanced only after you dismissed the video. **Continue** to see Markdown completion feedback."
\tcompleteWith "## Great!\\n\\nYou tested the opening guide, video, message and **completion feedback**."
}`
  },
  {
    id: 'playground-demo-course-3',
    title: '3. Project, API filter and ruler',
    code: `onStart => {
\tapis := make([]string, 0)
\tapis = append(apis, "xgo:github.com/goplus/spx/v3?Sprite.stepTo#0")
\tapis = append(apis, "xgo:github.com/goplus/spx/v3?Sprite.turn#0")
\tEditor.CodeEditor.filterAPIs apis
\tEditor.Ruler.enable
\tshowMessage "Only stepTo and turn are listed. The ruler is enabled. Click Continue to read the project code, format the workspace and disable the ruler."
\tnames := Editor.Project.listSprites()
\tcurrentCode := Editor.Project.getCode(names[0])
\tshowMessage "First sprite: " + names[0] + "\\n\\nCurrent code:\\n\\n" + currentCode
\tEditor.CodeEditor.formatWorkspace
\tEditor.Ruler.disable
\tcompleteWith "The workspace was formatted and the ruler disabled. The API filter remains visible while you continue editing."
}`
  },
  {
    id: 'playground-demo-course-4',
    title: '4. Runtime start, log and exit',
    code: `started := false
logged := false
onStart => {
\tshowPrelude "Click Continue, then Run. The project prints tutorial-demo. Runtime start and log callbacks record those events; the exit callback reports them."
}
Editor.Runtime.onStart => {
\tstarted = true
}
Editor.Runtime.onLog log => {
\tif log == "tutorial-demo\\n" {
\t\tlogged = true
\t}
}
Editor.Runtime.onExit code => {
\tif started && logged && code == 0 {
\t\tcompleteWith "Observed **Runtime start**, the tutorial-demo **log**, and a successful **exit**."
\t} else {
\t\tshowMessage "Not all expected events arrived. Check that the project prints tutorial-demo and exits normally, then try Run again."
\t}
}`
  },
  {
    id: 'playground-demo-course-5',
    title: '5. Copilot round and generation',
    code: `type Feedback struct {
\tMessage string
}
onStart => {
\tshowPrelude "This course needs working Copilot access. Click Continue, open Copilot, and send finish. After that conversation round completes, the course requests structured feedback and a short conclusion."
}
Copilot.onRoundComplete round => {
\tif round.UserMessage != "finish" {
\t\treturn
\t}
\tfeedback := &Feedback{}
\tCopilot.generateJSON "Return a short message confirming that the learner finished this capability demo.", feedback
\tshowMessage feedback.Message
\tconclusion := Copilot.generateText("Write one short sentence congratulating the learner for testing Copilot round events and structured generation.")
\tcompleteWith conclusion
}`
  },
  {
    id: 'playground-demo-course-6',
    title: '6. Overlapping dialogs and cancellation',
    code: `onStart => {
\tshowPrelude "This lower dialog stays pending while the upper message is open. Complete the course from the upper message to cancel this guide. You can also leave the course while both dialogs are pending."
}
onStart => {
\tshowMessage "This upper dialog deliberately overlaps the opening guide. Click Continue or press Escape to accept completion and cancel the pending guide."
\tcompleteWith "Completion cancelled the lower presentation. Closing this completion dialog lets you keep editing."
}`
  }
]
const playgroundMockCourseIDs = playgroundMockCourses.map((course) => course.id)

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
    const firstSprite = project.sprites[0]
    if (firstSprite == null) throw new Error('default sprite not found')
    firstSprite.setCode('onStart => {println "tutorial-demo"; wait 1; exit}\n')
    const secondSprite = firstSprite.clone()
    secondSprite.setCode('')
    secondSprite.setX(-120)
    secondSprite.setY(80)
    project.addSprite(secondSprite)
    const files: Files = {
      'index.json': fromConfig('index.json', {
        project: { type: 'spx', root: 'project' },
        inEditorPath: '/simple',
        copilotContext: 'Help the learner explore the Playground Course.'
      }),
      'assets/videos/opening/index.json': fromConfig('index.json', { path: 'opening.webm' }),
      ...prefixFiles(project.exportFiles(), 'project')
    }
    const content = await toFileCollection(files)
    content['assets/videos/opening/opening.webm'] =
      'https://qnyproj-api-assets-dev.s3.us-east-1.amazonaws.com/opening_1.webm'
    const courses: PlaygroundCourse[] = await Promise.all(
      playgroundMockCourses.map(async ({ id, title, code }) => ({
        id,
        owner: 'tutorial-demo',
        kind: 'playground' as const,
        title,
        thumbnail: '',
        content: { ...content, 'main_course.gox': await toDataUrl(fromText('main_course.gox', code)) }
      }))
    )
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
