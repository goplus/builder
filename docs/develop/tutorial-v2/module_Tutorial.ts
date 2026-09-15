/**
 * Enters and ends Courses; kind-specific loading and behavior remain internal.
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
  /** Loads the identified Course and Course Series, then enters the appropriate runtime. */
  startCourse(courseSeriesID: string, courseID: string): Promise<void>;
  /** Ends Guided state or exits the active Playground route to its Course Series. */
  endCurrentCourse(): Promise<void>;
}
