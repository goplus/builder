import type { Course, CourseSeries } from "./module_CourseApis";

/**
 * Owns Course lifecycle; kind-specific behavior remains internal.
 *
 * For a Playground Course, Tutorial interprets how the run ended from the
 * executor's exit reason together with whether the Course program requested
 * completion: `completed` after a completion request is a normal finish;
 * `completed` without one means the Course program fell through and is
 * reported as a Course-program defect; `stopped` means the Course was ended
 * from outside, such as the learner leaving; `error` means the Course program
 * failed.
 */
export interface Tutorial {
  readonly currentCourse: Course | null;
  readonly currentSeries: CourseSeries | null;
  /** Starts one loaded Course. Playground editor composition remains caller-owned. */
  startCourse(course: Course, series: CourseSeries | null): Promise<void>;
  /** Walks a Course Series using the supplied Course snapshots. */
  startCourseSeries(series: CourseSeries, courses: Course[]): Promise<void>;
  endCurrentCourse(): Promise<void>;
}
