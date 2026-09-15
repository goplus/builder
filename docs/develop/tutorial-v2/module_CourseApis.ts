import type { FileCollection } from "./base";

export type CourseKind = "guided" | "playground";

export type CourseBase = {
  id: string;
  owner: string;
  kind: CourseKind;
  title: string;
  thumbnail: string;
};

export type GuidedCourse = CourseBase & {
  kind: "guided";
  content: {
    entrypoint: string;
    prompt: string;
  };
};

/** Current unsaved Playground Course content used to generate its Copilot context. */
export type GeneratePlaygroundCourseCopilotContextParams = Pick<
  PlaygroundCourse,
  "title" | "thumbnail" | "content"
>;

export type GeneratePlaygroundCourseCopilotContextResult = {
  copilotContext: string;
};

export type PlaygroundCourse = CourseBase & {
  kind: "playground";
  /** An opaque Tutorial-project file collection. */
  content: FileCollection;
};

export type Course = GuidedCourse | PlaygroundCourse;

export type CourseSeries = {
  id: string;
  owner: string;
  kind: CourseKind;
  title: string;
  thumbnail: string;
  description: string;
  courseIDs: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type AddCourseParams =
  | Pick<GuidedCourse, "kind" | "title" | "thumbnail" | "content">
  | Pick<PlaygroundCourse, "kind" | "title" | "thumbnail" | "content">;
export type UpdateCourseParams =
  | Pick<GuidedCourse, "title" | "thumbnail" | "content">
  | Pick<PlaygroundCourse, "title" | "thumbnail" | "content">;
export type AddCourseSeriesParams = Pick<
  CourseSeries,
  "kind" | "title" | "thumbnail" | "description" | "courseIDs" | "order"
>;
export type UpdateCourseSeriesParams = Pick<
  CourseSeries,
  "title" | "thumbnail" | "description" | "courseIDs" | "order"
>;

export type ListCoursesParams = {
  courseSeriesID?: string;
  pageIndex: number;
  pageSize: number;
  orderBy?: "createdAt" | "updatedAt" | "sequenceInCourseSeries";
  sortOrder?: "asc" | "desc";
};

export type ListCourseSeriesParams = {
  kind?: CourseKind;
  pageIndex: number;
  pageSize: number;
  orderBy?: "createdAt" | "updatedAt" | "order";
  sortOrder?: "asc" | "desc";
};

export type ByPage<T> = {
  total: number;
  data: T[];
};

/** HTTP APIs provided by builder-backend for Course and Course Series data. */
export interface CourseApis {
  /** `POST /user/courses/playground/copilot-context`. Generates an editable context. */
  generatePlaygroundCourseCopilotContext(
    params: GeneratePlaygroundCourseCopilotContextParams,
    signal?: AbortSignal,
  ): Promise<GeneratePlaygroundCourseCopilotContextResult>;

  /** `GET /courses/{courseID}` */
  getCourse(id: string, signal?: AbortSignal): Promise<Course>;

  /** `GET /courses` */
  listCourses(
    params: ListCoursesParams,
    signal?: AbortSignal,
  ): Promise<ByPage<Course>>;

  /** `GET /user/courses` */
  listSignedInUserCourses(
    params: ListCoursesParams,
    signal?: AbortSignal,
  ): Promise<ByPage<Course>>;

  /** `POST /user/courses` */
  addCourse(params: AddCourseParams, signal?: AbortSignal): Promise<Course>;

  /** `PATCH /courses/{courseID}`. Course kind cannot be changed. */
  updateCourse(
    id: string,
    params: UpdateCourseParams,
    signal?: AbortSignal,
  ): Promise<Course>;

  /** `DELETE /courses/{courseID}` */
  deleteCourse(id: string, signal?: AbortSignal): Promise<void>;

  /** `GET /course-series/{courseSeriesID}` */
  getCourseSeries(id: string, signal?: AbortSignal): Promise<CourseSeries>;

  /** `GET /course-series` */
  listCourseSeries(
    params: ListCourseSeriesParams,
    signal?: AbortSignal,
  ): Promise<ByPage<CourseSeries>>;

  /** `GET /user/course-series` */
  listSignedInUserCourseSeries(
    params: ListCourseSeriesParams,
    signal?: AbortSignal,
  ): Promise<ByPage<CourseSeries>>;

  /** `POST /user/course-series` */
  addCourseSeries(
    params: AddCourseSeriesParams,
    signal?: AbortSignal,
  ): Promise<CourseSeries>;

  /** `PATCH /course-series/{courseSeriesID}` */
  updateCourseSeries(
    id: string,
    params: UpdateCourseSeriesParams,
    signal?: AbortSignal,
  ): Promise<CourseSeries>;

  /** `DELETE /course-series/{courseSeriesID}` */
  deleteCourseSeries(id: string, signal?: AbortSignal): Promise<void>;
}
