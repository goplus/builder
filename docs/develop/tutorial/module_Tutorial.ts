import { UI } from './base'
import { Course, CourseSeriesWithCourses } from './module_CourseApis'

/**
 * Component TutorialRoot initializes the Tutorial instance. Sample:
 * ```tsx
 * <TutorialRoot>
 *   <!-- Application UI -->
 * </TutorialRoot>
 * ```
 */
export declare function TutorialRoot(): UI

export interface Tutorial {
  /** The current learning course */
  currentCourse: Course | null
  /** The current learning course series */
  currentSeries: CourseSeriesWithCourses | null
  /** Start to learn given course within given series */
  startCourse(course: Course, series: CourseSeriesWithCourses): Promise<void>
  /** End the current learning course */
  endCurrentCourse(): void
}

/** Hook to access the Tutorial instance */
export declare function useTutorial(): Tutorial

/**
 * Component TutorialCourseSuccess is used to display a success message when a course is completed. Sample:
 * ```tsx
 * <TutorialCourseSuccess />
 * ```
 */
export declare function TutorialCourseSuccess(): UI
