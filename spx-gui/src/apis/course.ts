import { client, type ByPage, type FileCollection, type PaginationParams } from './common'
import { getPlaygroundMockCourse, listPlaygroundMockCourses } from './course-playground-mock'

export const courseTitleMaxLength = 200
/**
 * A prompt carries the lesson text together with its scaffold code, reference answer and
 * completion rules, so exercise and multi-sprite courses run several times longer than a plain
 * lesson. Kept in step with the API contract in `docs/openapi.yaml`.
 */
export const coursePromptMaxLength = 12000

/** The way a Course is delivered to the learner. */
export type CourseKind = 'guided' | 'playground'

export type CourseBase = {
  /** Unique identifier */
  id: string
  /** Username of the course's owner */
  owner: string
  /** Selects the Course content shape and learning flow. */
  kind: CourseKind
  /** Title of the course */
  title: string
  /** Universal URL of the course's thumbnail image */
  thumbnail: string
}

export type GuidedCourse = CourseBase & {
  kind: 'guided'
  content: {
    /** Starting URL of the guided course */
    entrypoint: string
    /** Prompt for the Tutorial Copilot */
    prompt: string
  }
}

export type PlaygroundCourse = CourseBase & {
  kind: 'playground'
  /** Authored Tutorial-project files loaded into a session-local project for the learner. */
  content: FileCollection
}

export type Course = GuidedCourse | PlaygroundCourse

type LegacyGuidedCourse = Omit<GuidedCourse, 'kind' | 'content'> & GuidedCourse['content']

function normalizeCourse(course: Course | LegacyGuidedCourse): Course {
  if ('kind' in course) return course
  const { entrypoint, prompt, ...base } = course
  return { ...base, kind: 'guided', content: { entrypoint, prompt } }
}

export function isGuidedCourse(course: Course): course is GuidedCourse {
  return course.kind === 'guided'
}

/** Get a course by ID */
export async function getCourse(id: string, signal?: AbortSignal) {
  const mockCourse = await getPlaygroundMockCourse(id, signal)
  if (mockCourse != null) return mockCourse
  const course = (await client.get(`/courses/${encodeURIComponent(id)}`, undefined, { signal })) as
    | Course
    | LegacyGuidedCourse
  return normalizeCourse(course)
}

export type AddCourseParams =
  | Pick<GuidedCourse, 'kind' | 'title' | 'thumbnail' | 'content'>
  | Pick<PlaygroundCourse, 'kind' | 'title' | 'thumbnail' | 'content'>
/** Fields to update; the endpoint patches only the fields given. */
export type UpdateCourseParams =
  | Partial<Pick<GuidedCourse, 'title' | 'thumbnail' | 'content'>>
  | Partial<Pick<PlaygroundCourse, 'title' | 'thumbnail' | 'content'>>

/** Current unsaved Playground Course content used to generate its Copilot context. */
export type GeneratePlaygroundCourseCopilotContextParams = Pick<PlaygroundCourse, 'title' | 'thumbnail' | 'content'>

export type GeneratePlaygroundCourseCopilotContextResult = {
  copilotContext: string
}

/** Generates an editable Copilot context for an unsaved Playground Course. */
export function generatePlaygroundCourseCopilotContext(
  params: GeneratePlaygroundCourseCopilotContextParams,
  signal?: AbortSignal
) {
  return client.post('/user/courses/playground/copilot-context', params, {
    signal
  }) as Promise<GeneratePlaygroundCourseCopilotContextResult>
}

/** Add a new course */
export function addCourse(params: AddCourseParams, signal?: AbortSignal) {
  return client.post('/user/courses', params, { signal }) as Promise<Course>
}

/** Update an existing course */
export function updateCourse(id: string, params: UpdateCourseParams, signal?: AbortSignal) {
  return client.patch(`/courses/${encodeURIComponent(id)}`, params, { signal }) as Promise<Course>
}

/** Delete a course */
export function deleteCourse(id: string) {
  return client.delete(`/courses/${encodeURIComponent(id)}`) as Promise<void>
}

export type ListCoursesParams = PaginationParams & {
  /** Filter courses by the course series ID */
  courseSeriesID?: string
  /** Field by which to order the results */
  orderBy?: 'createdAt' | 'updatedAt' | 'sequenceInCourseSeries'
  /** Order in which to sort the results */
  sortOrder?: 'asc' | 'desc'
}

export async function listCourses(params?: ListCoursesParams, signal?: AbortSignal) {
  const mockCourses = await listPlaygroundMockCourses(params, signal)
  if (mockCourses != null) return mockCourses
  const result = (await client.get('/courses', params, { signal })) as ByPage<Course | LegacyGuidedCourse>
  return { ...result, data: result.data.map(normalizeCourse) }
}

export async function listSignedInUserCourses(params?: ListCoursesParams, signal?: AbortSignal) {
  const result = (await client.get('/user/courses', params, { signal })) as ByPage<Course | LegacyGuidedCourse>
  return { ...result, data: result.data.map(normalizeCourse) }
}
