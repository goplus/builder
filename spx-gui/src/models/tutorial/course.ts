import { reactive } from 'vue'

import { fromText, toText, type Files } from '@/models/common/file'

import { DerivedFile } from './derived-file'

/**
 * Path (relative to the Tutorial-project root) of the course author's main program. The course format fixes this
 * name: the playground runner feeds this record to the XGo executor and the Course Editor edits it as text.
 * Consumed by: models/tutorial/project.ts#isClaimedPath, components/course-editor/upload.ts#validateUploadPath,
 * components/course-editor/course-tree.ts#buildCourseTree, components/course-editor/CourseEditor.vue#template,
 * components/tutorials/playground/runner.ts#PlaygroundCourseRunner.start, and the tests
 * models/tutorial/project.test.ts, components/course-editor/upload.test.ts,
 * components/course-editor/course-tree.test.ts, components/tutorials/playground/runner.test.ts.
 */
export const mainCourseFilePath = 'main_course.gox'

/**
 * The course author's main program (`main_course.gox`), held as a plain string so it can be bound to a text editor.
 *
 * Why it exists: the program is the only typed record besides `index.json` that the Tutorial project owns
 * directly; keeping it in its own small model lets `TutorialProject` treat it like the other claimed parts
 * (load from records, export to records) instead of special-casing a string field.
 *
 * Invariants:
 * - `code` is always a string (never null); a freshly constructed `Course` holds `''` unless given code.
 * - `export()` returns the same `File` instance for the same `code` (memoized through `codeFile`), so the
 *   Course Editor's dirty tracking (`getChangedPaths`) only sees a change when the text actually changed.
 * - The instance is reactive (`reactive(this)`), so `code` edits re-run computeds that read it.
 *
 * Consumed by: models/tutorial/project.ts#TutorialProject (owns one as `mainCourse`),
 * components/course-editor/CourseEditor.vue#template (binds `code` to `CourseTextDoc`),
 * components/course-editor/course-tree.ts#buildCourseTree (exports the record for the tree),
 * components/tutorials/playground/runner.ts#PlaygroundCourseRunner.start (runs `code`),
 * components/tutorials/playground/runner.test.ts (sets `code` directly).
 */
export class Course {
  /** The program source text. */
  code: string

  /** Memo generating the `main_course.gox` record from `code`; see `DerivedFile` for why identity matters. */
  private codeFile = new DerivedFile((code) => fromText(mainCourseFilePath, code))

  /**
   * Creates a course program model.
   * @param code - Initial program text; defaults to an empty program.
   * @returns A reactive `Course` (the constructor returns the reactive proxy so callers never hold the raw object).
   * Called by: models/tutorial/project.ts#TutorialProject.constructor.
   */
  constructor(code = '') {
    this.code = code
    return reactive(this) as this
  }

  /**
   * Replaces the program text.
   * @param code - The new program text.
   * @returns void; sets `code`, which makes the next `export()` produce a new `File` instance.
   * Called by: components/course-editor/CourseEditor.vue#template (`@update:text` of `CourseTextDoc`),
   * models/tutorial/project.test.ts, components/course-editor/course-tree.test.ts.
   */
  setCode(code: string) {
    this.code = code
  }

  /**
   * Reads the program text from a set of Tutorial-project records.
   * @param files - All records of the Tutorial project, keyed by path relative to its root.
   * @throws Error when `main_course.gox` is missing from `files`.
   * @returns Promise resolving once `code` has been replaced by the record's text.
   * Called by: models/tutorial/project.ts#TutorialProject.loadFiles.
   */
  async loadFiles(files: Files) {
    // The program record is mandatory: a course without a main program cannot run.
    const file = files[mainCourseFilePath]
    if (file == null) throw new Error(`file ${mainCourseFilePath} not found`)
    // Decode the record into the string the editor binds to.
    this.code = await toText(file)
  }

  /**
   * Produces the program record.
   * @returns A `Files` map holding only `main_course.gox`; the `File` instance is reused while `code` is unchanged.
   * Called by: models/tutorial/project.ts#TutorialProject.exportFiles,
   * components/course-editor/course-tree.ts#buildCourseTree.
   */
  export(): Files {
    return { [mainCourseFilePath]: this.codeFile.get(this.code) }
  }
}
