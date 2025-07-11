export type ProjectReference = {
  type: 'project'
  /** Full name of the project, in the format `owner/project`. */
  fullName: string
}

export type Reference = ProjectReference // We may support more reference types in the future

export type Course = {
  /** Unique identifier */
  id: string
  /** Username of the asset's owner */
  owner: string
  /** Title of the course */
  title: string
  /** Universal URL of the course's thumbnail image */
  thumbnail: string
  /** Starting URL of the course */
  entrypoint: string
  /** References of the course */
  references: Reference[]
  /** Prompt (for copilot) of the course */
  prompt: string
}

export type AddUpdateCourseParams = Pick<Course, 'title' | 'thumbnail' | 'references' | 'prompt'>

export type CourseSeries = {
  /** Unique identifier */
  id: string
  /** Title of the course series */
  title: string
  /** Array of course IDs that included in this series */
  courseIds: string[]
  /** Order/priority of the course series for sorting */
  order: number
}

export type AddUpdateCourseSeriesParams = Pick<CourseSeries, 'title' | 'courseIds' | 'order'>

export type CourseSeriesWithCourses = CourseSeries & {
  /** Array of courses included in this series */
  courses: Course[]
}

export interface CourseApis {
  getCourse(id: string): Promise<Course>
  addCourse(params: AddUpdateCourseParams): Promise<Course>
  updateCourse(id: string, params: AddUpdateCourseParams): Promise<Course>
  deleteCourse(id: string): Promise<void>

  getCourseSeries(id: string): Promise<CourseSeries>
  addCourseSeries(params: AddUpdateCourseSeriesParams): Promise<CourseSeries>
  updateCourseSeries(id: string, params: AddUpdateCourseSeriesParams): Promise<CourseSeries>
  deleteCourseSeries(id: string): Promise<void>
  getCourseSeriesWithCourses(id: string): Promise<CourseSeriesWithCourses>
  listCourseSeriesWithCourses(): Promise<CourseSeriesWithCourses[]>
}
